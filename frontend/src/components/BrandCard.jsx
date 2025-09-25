import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const BrandCardContainer = styled.div`
  background: white;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
  }
`;

const BrandLogo = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 15px;
  border-radius: 50%;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e9ecef;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const BrandName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
`;

const BrandLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  
  &:hover {
    color: #007bff;
  }
`;

const BrandCard = ({ brand }) => {
  return (
    <BrandCardContainer>
      <BrandLink to={`/brand/${brand._id}`}>
        <BrandLogo>
          {brand.logo ? (
            <img 
              src={brand.logo} 
              alt={brand.name}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.textContent = brand.name.charAt(0);
              }}
            />
          ) : (
            brand.name.charAt(0)
          )}
        </BrandLogo>
        <BrandName>{brand.name}</BrandName>
      </BrandLink>
    </BrandCardContainer>
  );
};

export default BrandCard;
