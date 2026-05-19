"use client"

import { m } from "framer-motion"
import type { ReactNode } from "react"

type SectionHeadingProps = {
  eyebrow: string
  title: ReactNode
  children?: ReactNode
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: SectionHeadingProps) {
  return (
    <m.div
      className="mb-16 text-center"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7 }}
    >
      <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
        {eyebrow}
      </p>
      <h2 className="glow-text text-3xl font-bold text-foreground md:text-5xl">
        <span className="text-balance">{title}</span>
      </h2>
      {children}
    </m.div>
  )
}
