import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const FooterContainer = styled.footer`
  background: #2c3e50;
  color: white;
  margin-top: 60px;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
`;

const FooterSection = styled.div`
  h3 {
    margin-bottom: 20px;
    font-size: 18px;
    color: #ecf0f1;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  li {
    margin-bottom: 10px;
  }
  
  a {
    color: #bdc3c7;
    text-decoration: none;
    transition: color 0.3s;
    
    &:hover {
      color: #3498db;
    }
  }
`;

const ContactInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  color: #bdc3c7;
  
  svg {
    margin-right: 10px;
    width: 16px;
    height: 16px;
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #34495e;
  border-radius: 50%;
  color: white;
  text-decoration: none;
  transition: background 0.3s;
  
  &:hover {
    background: #3498db;
  }
`;

const Newsletter = styled.div`
  input {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 5px;
    margin-bottom: 10px;
    font-size: 14px;
  }
  
  button {
    background: #3498db;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s;
    
    &:hover {
      background: #2980b9;
    }
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid #34495e;
  padding-top: 20px;
  text-align: center;
  color: #bdc3c7;
  font-size: 14px;
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterGrid>
          <FooterSection>
            <h3>FashionHub</h3>
            <p style={{ color: '#bdc3c7', lineHeight: '1.6' }}>
              Thương hiệu thời trang hàng đầu Việt Nam, mang đến những sản phẩm 
              chất lượng cao với thiết kế hiện đại và giá cả hợp lý.
            </p>
            <SocialLinks>
              <SocialLink href="#">
                <Facebook size={20} />
              </SocialLink>
              <SocialLink href="#">
                <Instagram size={20} />
              </SocialLink>
              <SocialLink href="#">
                <Twitter size={20} />
              </SocialLink>
            </SocialLinks>
          </FooterSection>
          
          <FooterSection>
            <h3>Liên kết nhanh</h3>
            <ul>
              <li><Link to="/">Trang chủ</Link></li>
              <li><Link to="/products">Sản phẩm</Link></li>
              <li><Link to="/categories">Danh mục</Link></li>
              <li><Link to="/sale">Khuyến mãi</Link></li>
              <li><Link to="/about">Về chúng tôi</Link></li>
              <li><Link to="/contact">Liên hệ</Link></li>
            </ul>
          </FooterSection>
          
          <FooterSection>
            <h3>Hỗ trợ khách hàng</h3>
            <ul>
              <li><Link to="/shipping">Chính sách vận chuyển</Link></li>
              <li><Link to="/returns">Chính sách đổi trả</Link></li>
              <li><Link to="/size-guide">Hướng dẫn chọn size</Link></li>
              <li><Link to="/faq">Câu hỏi thường gặp</Link></li>
              <li><Link to="/privacy">Chính sách bảo mật</Link></li>
              <li><Link to="/terms">Điều khoản sử dụng</Link></li>
            </ul>
          </FooterSection>
          
          <FooterSection>
            <h3>Liên hệ</h3>
            <ContactInfo>
              <MapPin />
              <span>123 Đường ABC, Quận 1, TP.HCM</span>
            </ContactInfo>
            <ContactInfo>
              <Phone />
              <span>0123 456 789</span>
            </ContactInfo>
            <ContactInfo>
              <Mail />
              <span>info@fashionhub.com</span>
            </ContactInfo>
            
            <Newsletter>
              <h4 style={{ marginBottom: '15px', color: '#ecf0f1' }}>
                Đăng ký nhận tin
              </h4>
              <input 
                type="email" 
                placeholder="Nhập email của bạn..." 
              />
              <button>Đăng ký</button>
            </Newsletter>
          </FooterSection>
        </FooterGrid>
        
        <FooterBottom>
          <p>&copy; 2024 FashionHub. Tất cả quyền được bảo lưu.</p>
        </FooterBottom>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;
