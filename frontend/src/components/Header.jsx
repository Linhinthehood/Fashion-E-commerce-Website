import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';

const HeaderContainer = styled.header`
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const TopBar = styled.div`
  background: #f8f9fa;
  padding: 8px 0;
  font-size: 14px;
  text-align: center;
  color: #666;
`;

const MainHeader = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
`;

const Logo = styled(Link)`
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
  letter-spacing: -1px;
`;

const SearchContainer = styled.div`
  flex: 1;
  max-width: 500px;
  margin: 0 40px;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 45px 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;

  &:focus {
    border-color: #007bff;
  }
`;

const SearchButton = styled.button`
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: #007bff;
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #0056b3;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
  position: relative;

  &:hover {
    background: #f8f9fa;
  }

  svg {
    width: 24px;
    height: 24px;
    color: #2c3e50;
  }
`;

const CartBadge = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Navigation = styled.nav`
  border-top: 1px solid #e9ecef;
  padding: 15px 0;
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 30px;
  justify-content: center;
`;

const NavItem = styled.li`
  a {
    text-decoration: none;
    color: #2c3e50;
    font-weight: 500;
    padding: 10px 0;
    transition: color 0.3s;
    
    &:hover {
      color: #007bff;
    }
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;

  @media (max-width: 768px) {
    display: block;
  }
`;

const MobileNav = styled.div`
  display: none;
  background: #fff;
  border-top: 1px solid #e9ecef;
  padding: 20px;

  @media (max-width: 768px) {
    display: ${props => props.isOpen ? 'block' : 'none'};
  }
`;

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartItemCount = 3; // Mock data

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <HeaderContainer>
      <TopBar>
        Miễn phí vận chuyển cho đơn hàng từ 500.000đ
      </TopBar>
      
      <MainHeader>
        <HeaderContent>
          <Logo to="/">FashionHub</Logo>
          
          <SearchContainer>
            <SearchInput 
              type="text" 
              placeholder="Tìm kiếm sản phẩm..." 
            />
            <SearchButton>
              <Search size={18} />
            </SearchButton>
          </SearchContainer>
          
          <HeaderActions>
            <ActionButton>
              <User size={24} />
            </ActionButton>
            
            <ActionButton>
              <ShoppingCart size={24} />
              <CartBadge>{cartItemCount}</CartBadge>
            </ActionButton>
            
            <MobileMenuButton onClick={toggleMobileMenu}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </MobileMenuButton>
          </HeaderActions>
        </HeaderContent>
        
        <Navigation>
          <NavList>
            <NavItem><Link to="/">Trang chủ</Link></NavItem>
            <NavItem><Link to="/products">Sản phẩm</Link></NavItem>
            <NavItem><Link to="/categories">Danh mục</Link></NavItem>
            <NavItem><Link to="/sale">Khuyến mãi</Link></NavItem>
            <NavItem><Link to="/about">Về chúng tôi</Link></NavItem>
            <NavItem><Link to="/contact">Liên hệ</Link></NavItem>
          </NavList>
        </Navigation>
        
        <MobileNav isOpen={isMobileMenuOpen}>
          <NavList style={{ flexDirection: 'column', gap: '15px' }}>
            <NavItem><Link to="/">Trang chủ</Link></NavItem>
            <NavItem><Link to="/products">Sản phẩm</Link></NavItem>
            <NavItem><Link to="/categories">Danh mục</Link></NavItem>
            <NavItem><Link to="/sale">Khuyến mãi</Link></NavItem>
            <NavItem><Link to="/about">Về chúng tôi</Link></NavItem>
            <NavItem><Link to="/contact">Liên hệ</Link></NavItem>
          </NavList>
        </MobileNav>
      </MainHeader>
    </HeaderContainer>
  );
};

export default Header;
