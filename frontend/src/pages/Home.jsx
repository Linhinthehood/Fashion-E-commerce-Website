import React from 'react';
import styled from 'styled-components';
import ProductCard from '../components/ProductCard';
import BrandCard from '../components/BrandCard';
import { 
  getFeaturedProducts, 
  getNewProducts, 
  getSaleProducts, 
  categories, 
  brands 
} from '../data/mockData';

const HomeContainer = styled.div`
  width: 100%;
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

const HeroSection = styled.section`
  background: #000;
  color: white;
  padding: 100px 0;
  text-align: center;
  margin-bottom: 60px;
  position: relative;
  overflow: hidden;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
`;

const HeroContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative;
  z-index: 2;
`;

const HeroTitle = styled.h1`
  font-size: 72px;
  font-weight: 900;
  margin-bottom: 20px;
  letter-spacing: -3px;
  line-height: 1.1;
`;

const HeroSubtitle = styled.p`
  font-size: 24px;
  margin-bottom: 40px;
  font-weight: 300;
  letter-spacing: 1px;
`;

const HeroButton = styled.button`
  background: white;
  color: #000;
  border: none;
  padding: 18px 40px;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f0f0f0;
    transform: translateY(-2px);
  }
`;

const Section = styled.section`
  margin-bottom: 60px;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const SectionTitle = styled.h2`
  font-size: 36px;
  font-weight: 900;
  color: #000;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: -1px;
`;

const SectionSubtitle = styled.p`
  font-size: 16px;
  color: #666;
  max-width: 600px;
  margin: 0 auto;
  font-weight: 300;
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 40px;
`;

const BrandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 40px;
`;

const CategoryCard = styled.div`
  background: white;
  border: 1px solid #e5e5e5;
  padding: 30px 20px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: #000;
    transform: translateY(-2px);
  }
`;

const CategoryIcon = styled.div`
  width: 60px;
  height: 60px;
  background: #f8f8f8;
  border-radius: 50%;
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-size: 24px;
`;

const CategoryName = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CategoryCount = styled.p`
  color: #666;
  font-size: 14px;
  font-weight: 300;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  margin-top: 40px;
`;

const FeatureCard = styled.div`
  background: white;
  padding: 40px 30px;
  text-align: center;
  border: 1px solid #e5e5e5;
`;

const FeatureIcon = styled.div`
  width: 50px;
  height: 50px;
  background: #000;
  border-radius: 50%;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const FeatureTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FeatureDescription = styled.p`
  color: #666;
  line-height: 1.6;
  font-weight: 300;
`;

const Home = () => {
  const getCategoryIcon = (articleType) => {
    const iconMap = {
      'Shirts': '👔',
      'Tshirts': '👕',
      'Jeans': '👖',
      'Dresses': '👗',
      'Jackets': '🧥',
      'Sneakers': '👟',
      'Handbags': '👜',
      'Watches': '⌚',
      'Perfume': '🌸'
    };
    return iconMap[articleType] || '👕';
  };

  const features = [
    {
      icon: '🚚',
      title: 'Free Shipping',
      description: 'Free shipping on orders over $50'
    },
    {
      icon: '🔄',
      title: 'Easy Returns',
      description: 'Free returns within 30 days'
    },
    {
      icon: '💎',
      title: 'Quality Guarantee',
      description: 'Premium quality products guaranteed'
    },
    {
      icon: '🎁',
      title: 'Great Deals',
      description: 'Amazing deals and promotions'
    }
  ];

  return (
    <HomeContainer>
      <HeroSection>
        <HeroContent>
          <HeroTitle>FASHION HUB</HeroTitle>
          <HeroSubtitle>Discover the latest collection with unique designs and premium quality</HeroSubtitle>
          <HeroButton>Shop Now</HeroButton>
        </HeroContent>
      </HeroSection>

      <Container>
        <Section>
          <SectionHeader>
            <SectionTitle>Featured Products</SectionTitle>
            <SectionSubtitle>The most loved products from our collection</SectionSubtitle>
          </SectionHeader>
          <ProductsGrid>
            {getFeaturedProducts().map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </ProductsGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>Shop Categories</SectionTitle>
            <SectionSubtitle>Explore our diverse range of fashion categories</SectionSubtitle>
          </SectionHeader>
          <CategoryGrid>
            {categories.map((category) => (
              <CategoryCard key={category._id}>
                <CategoryIcon>{getCategoryIcon(category.articleType)}</CategoryIcon>
                <CategoryName>{category.displayName}</CategoryName>
                <CategoryCount>{category.description}</CategoryCount>
              </CategoryCard>
            ))}
          </CategoryGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>Featured Brands</SectionTitle>
            <SectionSubtitle>Discover the world's leading fashion brands</SectionSubtitle>
          </SectionHeader>
          <BrandGrid>
            {brands.slice(0, 8).map(brand => (
              <BrandCard key={brand._id} brand={brand} />
            ))}
          </BrandGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>New Arrivals</SectionTitle>
            <SectionSubtitle>The latest products just added to our collection</SectionSubtitle>
          </SectionHeader>
          <ProductsGrid>
            {getNewProducts().map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </ProductsGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>On Sale</SectionTitle>
            <SectionSubtitle>Amazing deals on your favorite items</SectionSubtitle>
          </SectionHeader>
          <ProductsGrid>
            {getSaleProducts().map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </ProductsGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>Why Choose Us?</SectionTitle>
            <SectionSubtitle>Reasons why customers trust and choose FashionHub</SectionSubtitle>
          </SectionHeader>
          <FeaturesGrid>
            {features.map((feature, index) => (
              <FeatureCard key={index}>
                <FeatureIcon>{feature.icon}</FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </FeatureCard>
            ))}
          </FeaturesGrid>
        </Section>
      </Container>
    </HomeContainer>
  );
};

export default Home;
