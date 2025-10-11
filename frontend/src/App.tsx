

import React, { useEffect } from 'react';
import Lenis from 'lenis';
import './App.scss';
import Layout from './layout/layout';


function App() {
  useEffect(() => {
    const lenis = new Lenis({
      smooth: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <Layout>
      <div className='App'>
        <h2>Bienvenido a Accidentes Chile</h2>
      </div>
    </Layout>
  );
}

export default App
