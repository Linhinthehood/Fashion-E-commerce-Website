# FashionCLIP.py
import contextlib
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import CLIPModel


class FashionCLIP(nn.Module):
    """CLIP backbone with optional 256-D projection heads for image/text embeddings.

    Improvements over the basic version:
    - Optional projection and LayerNorm toggles
    - Optional torch.compile for speed when Torch 2 available
    - Optional FP16 autocast at inference when CUDA is available
    - Helper encode methods for text-only / image-only use cases
    - Method to (un)freeze the CLIP backbone
    """

    def __init__(
        self,
        model_name: str,
        embedding_dim: int = 256,
        use_projection: bool = True,
        use_layer_norm: bool = True,
        enable_compile: bool = False,
    ) -> None:
        super().__init__()

        self.clip = CLIPModel.from_pretrained(model_name)
        self.use_projection = use_projection

        if enable_compile and hasattr(torch, "compile"):
            # Compile the CLIP submodule when Torch 2 is available
            try:
                self.clip = torch.compile(self.clip, mode="max-autotune")  # type: ignore[attr-defined]
            except Exception:
                # Fallback silently if compilation is unsupported in env
                pass

        if use_projection:
            clip_dim = self.clip.config.projection_dim
            if use_layer_norm:
                self.image_projection = nn.Sequential(
                    nn.Linear(clip_dim, embedding_dim),
                    nn.LayerNorm(embedding_dim),
                )
                self.text_projection = nn.Sequential(
                    nn.Linear(clip_dim, embedding_dim),
                    nn.LayerNorm(embedding_dim),
                )
            else:
                self.image_projection = nn.Linear(clip_dim, embedding_dim)
                self.text_projection = nn.Linear(clip_dim, embedding_dim)
            self.embedding_dim = embedding_dim
        else:
            # Use CLIP's own projection outputs directly
            self.image_projection = nn.Identity()
            self.text_projection = nn.Identity()
            self.embedding_dim = self.clip.config.projection_dim

        self._init_weights()

    def _init_weights(self) -> None:
        """Initialize projection weights for stability (no-op if Identity)."""
        for module in (getattr(self, "image_projection", None), getattr(self, "text_projection", None)):
            if isinstance(module, nn.Sequential) and len(module) > 0 and isinstance(module[0], nn.Linear):
                linear = module[0]
                nn.init.xavier_uniform_(linear.weight)
                if linear.bias is not None:
                    nn.init.zeros_(linear.bias)
            elif isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)

    def set_backbone_trainable(self, trainable: bool) -> None:
        """Enable or disable training for CLIP backbone parameters."""
        for param in self.clip.parameters():
            param.requires_grad = trainable

    def forward(self, pixel_values=None, input_ids=None, attention_mask=None):
        """Forward pass returning normalized embeddings.

        Any of the modalities may be omitted (None). The corresponding output will be None.
        """
        # Use FP16 autocast during inference on CUDA to reduce latency/VRAM
        use_amp = (not self.training) and torch.cuda.is_available()
        context = torch.autocast("cuda", dtype=torch.float16) if use_amp else contextlib.nullcontext()

        with context:
            outputs = self.clip(
                pixel_values=pixel_values,
                input_ids=input_ids,
                attention_mask=attention_mask,
            )

            image_embeds = getattr(outputs, "image_embeds", None)
            text_embeds = getattr(outputs, "text_embeds", None)

            if image_embeds is not None:
                image_embeds = self.image_projection(image_embeds)
                image_embeds = F.normalize(image_embeds, p=2, dim=1)

            if text_embeds is not None:
                text_embeds = self.text_projection(text_embeds)
                text_embeds = F.normalize(text_embeds, p=2, dim=1)

        return image_embeds, text_embeds

    @torch.no_grad()
    def encode_text(self, input_ids, attention_mask):
        """Encode text into normalized embeddings."""
        _, text = self.forward(pixel_values=None, input_ids=input_ids, attention_mask=attention_mask)
        return text

    @torch.no_grad()
    def encode_image(self, pixel_values):
        """Encode image into normalized embeddings."""
        image, _ = self.forward(pixel_values=pixel_values, input_ids=None, attention_mask=None)
        return image
