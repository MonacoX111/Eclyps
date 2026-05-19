"use client"

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion"

export function MotionProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
