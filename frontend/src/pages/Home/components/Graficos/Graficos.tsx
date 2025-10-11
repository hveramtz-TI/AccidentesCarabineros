import React from 'react'
import './Graficos.scss'

type Props = {}

const Graficos = (props: Props) => {
  return (
    <div className='graficos-container'>
        <div className=''>

        </div>
        <div className='contadores'>
            <div className='contador'>
                <span>Muertes</span>
            </div>
            <div className='contador'>
                <span>Graves</span>
            </div>
            <div className='contador'>
                <span>Muy Graves</span>
            </div>
            <div className='contador'>
                <span>Leves</span>
            </div>
            <div className='contador'>
                <span>Ilesos</span>
            </div>
        </div>
    </div>
  )
}

export default Graficos