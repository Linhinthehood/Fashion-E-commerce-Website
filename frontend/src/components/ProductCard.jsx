import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Heart, ShoppingCart, Star } from 'lucide-react';

const CardContainer = styled.div`
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 250px;
  overflow: hidden;
`;

const ProductImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
  
  ${CardContainer}:hover & {
    transform: scale(1.05);
  }
`;

const Badge = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background: ${props => props.type === 'sale' ? '#dc3545' : '#28a745'};
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
`;

const WishlistButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255,255,255,0.9);
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  opacity: 0;
  
  ${CardContainer}:hover & {
    opacity: 1;
  }
  
  &:hover {
    background: #dc3545;
    color: white;
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ProductInfo = styled.div`
  padding: 20px;
`;

const Category = styled.p`
  color: #6c757d;
  font-size: 12px;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProductName = styled.h3`
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: #2c3e50;
  
  a {
    text-decoration: none;
    color: inherit;
    
    &:hover {
      color: #007bff;
    }
  }
`;

const Rating = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const Stars = styled.div`
  display: flex;
  gap: 2px;
  margin-right: 8px;
`;

const StarIcon = styled(Star)`
  width: 14px;
  height: 14px;
  color: ${props => props.filled ? '#ffc107' : '#e9ecef'};
  fill: ${props => props.filled ? '#ffc107' : 'none'};
`;

const RatingText = styled.span`
  font-size: 12px;
  color: #6c757d;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
`;

const CurrentPrice = styled.span`
  font-size: 18px;
  font-weight: bold;
  color: #dc3545;
`;

const OriginalPrice = styled.span`
  font-size: 14px;
  color: #6c757d;
  text-decoration: line-through;
`;

const AddToCartButton = styled.button`
  width: 100%;
  background: #007bff;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProductCard = ({ product }) => {
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon 
          key={i} 
          filled={i <= rating} 
        />
      );
    }
    return stars;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <CardContainer>
      <ImageContainer>
        <ProductImage 
          src={product.imageUrl} 
          alt={product.name}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x250?text=No+Image';
          }}
        />
        
        {product.featured && (
          <Badge type="featured">Featured</Badge>
        )}
        
        {discountPercentage > 0 && (
          <Badge type="sale">-{discountPercentage}%</Badge>
        )}
        
        <WishlistButton>
          <Heart />
        </WishlistButton>
      </ImageContainer>
      
      <ProductInfo>
        <Category>{product.articleType}</Category>
        
        <ProductName>
          <Link to={`/product/${product._id}`}>
            {product.name}
          </Link>
        </ProductName>
        
        <Rating>
          <Stars>
            {renderStars(Math.round(product.rating))}
          </Stars>
          <RatingText>({product.reviews})</RatingText>
        </Rating>
        
        <PriceContainer>
          <CurrentPrice>{formatPrice(product.price)}</CurrentPrice>
          {product.originalPrice && product.originalPrice > product.price && (
            <OriginalPrice>{formatPrice(product.originalPrice)}</OriginalPrice>
          )}
        </PriceContainer>
        
        <AddToCartButton disabled={!product.inStock}>
          <ShoppingCart />
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </AddToCartButton>
      </ProductInfo>
    </CardContainer>
  );
};

export default ProductCard;
