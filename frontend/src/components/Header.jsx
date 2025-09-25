import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Search, ShoppingCart, User, ChevronDown } from 'lucide-react';
import { categories } from '../data/mockData';

const HeaderContainer = styled.header`
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
`;

const Logo = styled(Link)`
  font-size: 32px;
  font-weight: 900;
  color: #000;
  text-decoration: none;
  letter-spacing: -2px;
  
  &:hover {
    color: #000;
  }
`;

const Navigation = styled.nav`
  display: flex;
  align-items: center;
  gap: 40px;
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 35px;
  align-items: center;
`;

const NavItem = styled.li`
  position: relative;
  
  a {
    text-decoration: none;
    color: #000;
    font-weight: 500;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 0;
    transition: color 0.3s ease;
    display: flex;
    align-items: center;
    gap: 5px;
    
    &:hover {
      color: #333;
    }
  }
`;

const DropdownContainer = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-top: 2px solid #000;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  min-width: 250px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  z-index: 1001;
  
  ${NavItem}:hover & {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

const DropdownList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 15px 0;
`;

const DropdownItem = styled.li`
  a {
    display: block;
    padding: 8px 20px;
    color: #333;
    text-decoration: none;
    font-size: 14px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    transition: background 0.2s ease;
    
    &:hover {
      background: #f8f8f8;
      color: #000;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 25px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
  position: relative;

  &:hover {
    opacity: 0.7;
  }

  svg {
    width: 22px;
    height: 22px;
    color: #000;
  }
`;

const CartBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  background: #000;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;

  @media (max-width: 1024px) {
    display: block;
  }
`;

const MobileNav = styled.div`
  display: none;
  background: #fff;
  border-top: 1px solid #e5e5e5;
  padding: 20px;

  @media (max-width: 1024px) {
    display: ${props => props.isOpen ? 'block' : 'none'};
  }
`;

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartItemCount = 3; // Mock data

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Group categories by masterCategory
  const masterCategories = {
    'Apparel': categories.filter(cat => cat.masterCategory === 'Apparel'),
    'Footwear': categories.filter(cat => cat.masterCategory === 'Footwear'),
    'Accessories': categories.filter(cat => cat.masterCategory === 'Accessories')
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">FASHIONHUB</Logo>
        
        <Navigation>
          <NavList>
            {Object.keys(masterCategories).map(masterCat => (
              <NavItem key={masterCat}>
                <Link to={`/category/${masterCat.toLowerCase()}`}>
                  {masterCat}
                  <ChevronDown size={14} />
                </Link>
                <DropdownContainer>
                  <DropdownList>
                    <DropdownItem>
                      <Link to={`/category/${masterCat.toLowerCase()}`}>
                        Shop All {masterCat}
                      </Link>
                    </DropdownItem>
                    {masterCategories[masterCat].map(category => (
                      <DropdownItem key={category._id}>
                        <Link to={`/category/${category.articleType.toLowerCase()}`}>
                          {category.displayName}
                        </Link>
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </DropdownContainer>
              </NavItem>
            ))}
            <NavItem>
              <Link to="/brands">BRANDS</Link>
            </NavItem>
            <NavItem>
              <Link to="/sale">SALE</Link>
            </NavItem>
          </NavList>
        </Navigation>
        
        <HeaderActions>
          <ActionButton>
            <Search size={22} />
          </ActionButton>
          
          <ActionButton>
            <User size={22} />
          </ActionButton>
          
          <ActionButton>
            <ShoppingCart size={22} />
            <CartBadge>{cartItemCount}</CartBadge>
          </ActionButton>
          
          <MobileMenuButton onClick={toggleMobileMenu}>
            ☰
          </MobileMenuButton>
        </HeaderActions>
      </HeaderContent>
      
      <MobileNav isOpen={isMobileMenuOpen}>
        <NavList style={{ flexDirection: 'column', gap: '15px', alignItems: 'flex-start' }}>
          {Object.keys(masterCategories).map(masterCat => (
            <NavItem key={masterCat}>
              <Link to={`/category/${masterCat.toLowerCase()}`}>
                {masterCat}
              </Link>
            </NavItem>
          ))}
          <NavItem>
            <Link to="/brands">BRANDS</Link>
          </NavItem>
          <NavItem>
            <Link to="/sale">SALE</Link>
          </NavItem>
        </NavList>
      </MobileNav>
    </HeaderContainer>
  );
};

export default Header;
