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
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

const HeroSection = styled.section`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 80px 0;
  text-align: center;
  margin-bottom: 60px;
  border-radius: 10px;
  margin: 20px 0 60px 0;
`;

const HeroTitle = styled.h1`
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const HeroSubtitle = styled.p`
  font-size: 20px;
  margin-bottom: 30px;
  opacity: 0.9;
`;

const HeroButton = styled.button`
  background: white;
  color: #667eea;
  border: none;
  padding: 15px 30px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
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
  font-size: 32px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
`;

const SectionSubtitle = styled.p`
  font-size: 16px;
  color: #6c757d;
  max-width: 600px;
  margin: 0 auto;
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
  border-radius: 10px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
  }
`;

const CategoryIcon = styled.div`
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
`;

const CategoryName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
`;

const CategoryCount = styled.p`
  color: #6c757d;
  font-size: 14px;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
  margin-top: 40px;
`;

const FeatureCard = styled.div`
  background: #f8f9fa;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
`;

const FeatureIcon = styled.div`
  width: 50px;
  height: 50px;
  background: #007bff;
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
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 10px;
`;

const FeatureDescription = styled.p`
  color: #6c757d;
  line-height: 1.6;
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
      title: 'Miễn phí vận chuyển',
      description: 'Miễn phí vận chuyển cho đơn hàng từ 500.000đ'
    },
    {
      icon: '🔄',
      title: 'Đổi trả dễ dàng',
      description: 'Đổi trả miễn phí trong vòng 30 ngày'
    },
    {
      icon: '💎',
      title: 'Chất lượng cao',
      description: 'Cam kết chất lượng sản phẩm tốt nhất'
    },
    {
      icon: '🎁',
      title: 'Khuyến mãi hấp dẫn',
      description: 'Nhiều chương trình khuyến mãi hấp dẫn'
    }
  ];

  return (
    <HomeContainer>
      <HeroSection>
        <HeroTitle>Thời trang hiện đại</HeroTitle>
        <HeroSubtitle>Khám phá bộ sưu tập mới nhất với thiết kế độc đáo và chất lượng cao</HeroSubtitle>
        <HeroButton>Mua sắm ngay</HeroButton>
      </HeroSection>

      <Section>
        <SectionHeader>
          <SectionTitle>Sản phẩm nổi bật</SectionTitle>
          <SectionSubtitle>Những sản phẩm được yêu thích nhất từ bộ sưu tập của chúng tôi</SectionSubtitle>
        </SectionHeader>
        <ProductsGrid>
          {getFeaturedProducts().map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </ProductsGrid>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Danh mục sản phẩm</SectionTitle>
          <SectionSubtitle>Khám phá đa dạng các danh mục sản phẩm thời trang</SectionSubtitle>
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
          <SectionTitle>Thương hiệu nổi bật</SectionTitle>
          <SectionSubtitle>Khám phá các thương hiệu thời trang hàng đầu thế giới</SectionSubtitle>
        </SectionHeader>
        <BrandGrid>
          {brands.slice(0, 8).map(brand => (
            <BrandCard key={brand._id} brand={brand} />
          ))}
        </BrandGrid>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Sản phẩm mới</SectionTitle>
          <SectionSubtitle>Những sản phẩm mới nhất vừa được cập nhật</SectionSubtitle>
        </SectionHeader>
        <ProductsGrid>
          {getNewProducts().map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </ProductsGrid>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Đang giảm giá</SectionTitle>
          <SectionSubtitle>Những sản phẩm đang được giảm giá hấp dẫn</SectionSubtitle>
        </SectionHeader>
        <ProductsGrid>
          {getSaleProducts().map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </ProductsGrid>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Tại sao chọn chúng tôi?</SectionTitle>
          <SectionSubtitle>Những lý do khiến khách hàng tin tưởng và lựa chọn FashionHub</SectionSubtitle>
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
    </HomeContainer>
  );
};

export default Home;
