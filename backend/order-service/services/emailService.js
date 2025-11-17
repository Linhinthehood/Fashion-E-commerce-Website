const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Email templates
const emailTemplates = {
  orderConfirmation: (orderData) => {
    const { order, user, orderItems, address } = orderData;
    
    const itemsHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.image || 'https://via.placeholder.com/80'}" 
               alt="${item.productName}" 
               style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.productName}</strong><br>
          <small style="color: #666;">${item.brand} - ${item.color} - Size: ${item.size}</small><br>
          <small style="color: #666;">SKU: ${item.sku}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          <strong>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.subPrice)}</strong>
        </td>
      </tr>
    `).join('');

    return {
      subject: `Xác nhận đơn hàng #${order._id.toString().slice(-8)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .info-label { font-weight: bold; color: #666; }
            .info-value { color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; border-radius: 8px; overflow: hidden; }
            th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: bold; }
            .total-row { background: #f9f9f9; font-weight: bold; font-size: 1.1em; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Đơn hàng của bạn đã được đặt thành công!</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${user.name}</strong>,</p>
              <p>Cảm ơn bạn đã đặt hàng tại cửa hàng của chúng tôi!</p>
              
              <div class="order-info">
                <h2 style="margin-top: 0;">Thông tin đơn hàng</h2>
                <div class="info-row">
                  <span class="info-label">Mã đơn hàng:</span>
                  <span class="info-value">#${order._id.toString().slice(-8)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ngày đặt:</span>
                  <span class="info-value">${new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phương thức thanh toán:</span>
                  <span class="info-value">${order.paymentMethod}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Trạng thái thanh toán:</span>
                  <span class="info-value">${order.paymentStatus}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Trạng thái giao hàng:</span>
                  <span class="info-value">${order.shipmentStatus}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Địa chỉ giao hàng:</span>
                  <span class="info-value">${address.name}: ${address.addressInfo}</span>
                </div>
              </div>

              <h3>Chi tiết sản phẩm</h3>
              <table>
                <thead>
                  <tr>
                    <th>Hình ảnh</th>
                    <th>Sản phẩm</th>
                    <th style="text-align: center;">Số lượng</th>
                    <th style="text-align: right;">Đơn giá</th>
                    <th style="text-align: right;">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" style="text-align: right; padding: 15px; font-weight: bold;">Tổng tiền:</td>
                    <td style="text-align: right; padding: 15px; font-weight: bold;">
                      ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}
                    </td>
                  </tr>
                  ${order.discount > 0 ? `
                  <tr>
                    <td colspan="4" style="text-align: right; padding: 10px; color: #e74c3c;">Giảm giá:</td>
                    <td style="text-align: right; padding: 10px; color: #e74c3c;">
                      -${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.discount)}
                    </td>
                  </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td colspan="4" style="text-align: right; padding: 15px;">Tổng thanh toán:</td>
                    <td style="text-align: right; padding: 15px; font-size: 1.2em; color: #667eea;">
                      ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.finalPrice)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <p style="margin-top: 30px;">
                Chúng tôi sẽ xử lý đơn hàng của bạn và gửi thông báo khi đơn hàng được giao.
              </p>
              <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Fashion E-commerce. Tất cả quyền được bảo lưu.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  },
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    console.log('[EmailService] Attempting to send email to:', to);
    console.log('[EmailService] SMTP_HOST:', process.env.SMTP_HOST || 'not set');
    console.log('[EmailService] SMTP_PORT:', process.env.SMTP_PORT || 'not set');
    console.log('[EmailService] SMTP_USER:', process.env.SMTP_USER ? 'set' : 'not set');
    console.log('[EmailService] SMTP_PASS:', process.env.SMTP_PASS ? 'set' : 'not set');
    
    // Skip sending email if SMTP is not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[EmailService] SMTP not configured. Email would be sent to:', to);
      console.warn('[EmailService] Subject:', subject);
      return { success: true, skipped: true };
    }

    const transporter = createTransporter();
    console.log('[EmailService] Transporter created successfully');
    
    const mailOptions = {
      from: `"Fashion E-commerce" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    console.log('[EmailService] Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Email sent successfully. MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] Error sending email:', error.message);
    console.error('[EmailService] Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return { success: false, error: error.message };
  }
};

// Send order confirmation email
const sendOrderConfirmationEmail = async (orderData) => {
  const template = emailTemplates.orderConfirmation(orderData);
  return await sendEmail(orderData.user.email, template.subject, template.html);
};

module.exports = {
  sendEmail,
  sendOrderConfirmationEmail,
  emailTemplates,
};

