import React from 'react'

type Props = object

function Section({ children }: React.PropsWithChildren<Props>) {
  return (
    <section className="flex h-dvh w-auto px-5">
        {children}
    </section>
  )
}

export default Section