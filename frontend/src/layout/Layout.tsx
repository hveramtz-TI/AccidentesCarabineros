import React from 'react'
import './Layout.scss'
import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'

type Props = {
  children?: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <div className='layout'>
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export default Layout