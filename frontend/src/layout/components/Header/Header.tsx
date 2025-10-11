import React from 'react'
import './Header.scss'

type Props = {}

const Header = (props: Props) => {
  return (
    <header>
      <h1>Accidentes Chile</h1>
      <div className='contador-accidentes'>
        <span className='title-contador'>Total de Accidentes</span>
        <span className='numero-accidentes'>0</span>
      </div>
    </header>
  )
}

export default Header