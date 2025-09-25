import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f8f9fa;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  ul, ol {
    list-style: none;
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
  }

  img {
    max-width: 100%;
    height: auto;
  }
`;

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  flex: 1;
  padding-top: 20px;
`;

const LoadingPage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  color: #6c757d;
`;

function App() {
  return (
    <Router>
      <GlobalStyle />
      <AppContainer>
        <Header />
        <MainContent>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={
              <LoadingPage>
                Trang sản phẩm đang được phát triển...
              </LoadingPage>
            } />
            <Route path="/categories" element={
              <LoadingPage>
                Trang danh mục đang được phát triển...
              </LoadingPage>
            } />
            <Route path="/sale" element={
              <LoadingPage>
                Trang khuyến mãi đang được phát triển...
              </LoadingPage>
            } />
            <Route path="/about" element={
              <LoadingPage>
                Trang giới thiệu đang được phát triển...
              </LoadingPage>
            } />
            <Route path="/contact" element={
              <LoadingPage>
                Trang liên hệ đang được phát triển...
              </LoadingPage>
            } />
            <Route path="/product/:id" element={
              <LoadingPage>
                Trang chi tiết sản phẩm đang được phát triển...
              </LoadingPage>
            } />
            <Route path="*" element={
              <LoadingPage>
                Trang không tìm thấy - 404
              </LoadingPage>
            } />
          </Routes>
        </MainContent>
        <Footer />
      </AppContainer>
    </Router>
  );
}

export default App;
