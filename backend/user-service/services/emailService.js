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
  forgotPassword: (userData, temporaryPassword) => {
    const { name, email } = userData;
    
    return {
      subject: 'Mật khẩu tạm thời của bạn',
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
            .password-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #667eea; }
            .password { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Yêu cầu đặt lại mật khẩu</h1>
            </div>
            <div class="content">
              <p>Xin chào <strong>${name}</strong>,</p>
              <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
              
              <div class="password-box">
                <p style="margin: 0 0 10px 0; color: #666;">Mật khẩu tạm thời của bạn:</p>
                <div class="password">${temporaryPassword}</div>
              </div>

              <div class="warning">
                <strong>⚠️ Lưu ý quan trọng:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Mật khẩu này chỉ có hiệu lực tạm thời</li>
                  <li>Bạn <strong>PHẢI</strong> đổi mật khẩu ngay sau khi đăng nhập</li>
                  <li>Không chia sẻ mật khẩu này với bất kỳ ai</li>
                  <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ với chúng tôi ngay</li>
                </ul>
              </div>

              <p style="margin-top: 30px;">
                Sau khi đăng nhập bằng mật khẩu tạm thời này, bạn sẽ được yêu cầu đổi sang mật khẩu mới.
              </p>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">
                  Đăng nhập ngay
                </a>
              </div>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với chúng tôi nếu bạn có bất kỳ lo ngại nào về bảo mật tài khoản.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Fashion E-commerce. Tất cả quyền được bảo lưu.</p>
              <p>Email này được gửi tự động, vui lòng không trả lời email này.</p>
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
    // Skip sending email if SMTP is not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP not configured. Email would be sent to:', to);
      console.warn('Subject:', subject);
      return { success: true, skipped: true };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Fashion E-commerce" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send forgot password email
const sendForgotPasswordEmail = async (userData, temporaryPassword) => {
  const template = emailTemplates.forgotPassword(userData, temporaryPassword);
  return await sendEmail(userData.email, template.subject, template.html);
};

// Contact form email template
const contactFormTemplate = (contactData) => {
  const { name, email, phone, subject, message } = contactData;
  
  return {
    subject: `New Contact Form Submission${subject ? `: ${subject}` : ''}`,
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
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .info-row { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; color: #667eea; display: inline-block; width: 120px; }
          .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; word-wrap: break-word; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 New Contact Form Message</h1>
          </div>
          <div class="content">
            <p>You have received a new message from your website contact form.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #667eea;">Contact Information</h3>
              <div class="info-row">
                <span class="info-label">Name:</span>
                <span>${name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span><a href="mailto:${email}">${email}</a></span>
              </div>
              ${phone ? `
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span><a href="tel:${phone}">${phone}</a></span>
              </div>
              ` : ''}
              ${subject ? `
              <div class="info-row">
                <span class="info-label">Subject:</span>
                <span>${subject}</span>
              </div>
              ` : ''}
              <div class="info-row" style="border-bottom: none;">
                <span class="info-label">Date:</span>
                <span>${new Date().toLocaleString()}</span>
              </div>
            </div>

            <div class="message-box">
              <h3 style="margin-top: 0; color: #667eea;">Message:</h3>
              <p>${message}</p>
            </div>

            <div class="footer">
              <p>This is an automated message from your Fashion E-commerce website contact form.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// Send contact form email to multiple recipients
const sendContactFormEmail = async (contactData, recipients = []) => {
  const template = contactFormTemplate(contactData);
  const recipientEmails = recipients.join(', ');
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Fashion E-commerce Contact" <${process.env.SMTP_USER}>`,
      to: recipientEmails,
      replyTo: contactData.email,
      subject: template.subject,
      html: template.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Contact form email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending contact form email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendForgotPasswordEmail,
  sendContactFormEmail,
  emailTemplates,
};

