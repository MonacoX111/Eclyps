"use client"

import { useEffect, useRef } from "react"

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const isSmallScreen = () => window.innerWidth < 768
    const getFrameInterval = () => (isSmallScreen() ? 1000 / 30 : 0)
    const getParticleLimits = () =>
      isSmallScreen()
        ? { initial: 36, max: 48 }
        : { initial: 60, max: 80 }

    let animationId: number | null = null
    let isRunning = false
    let lastFrameTime = 0
    let isVisible = document.visibilityState === "visible"
    let isIntersecting = true
    let isReducedMotion = reducedMotionQuery.matches
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      life: number
      maxLife: number
    }> = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = window.innerWidth
      const height = window.innerHeight

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const { max } = getParticleLimits()
      if (particles.length > max) {
        particles.splice(max)
      }
    }
    resize()
    window.addEventListener("resize", resize)

    const createParticle = () => {
      const maxLife = 200 + Math.random() * 300
      return {
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.3 + Math.random() * 0.7),
        size: Math.random() * 2 + 0.5,
        opacity: 0,
        life: 0,
        maxLife,
      }
    }

    for (let i = 0; i < getParticleLimits().initial; i++) {
      const p = createParticle()
      p.y = Math.random() * window.innerHeight
      p.life = Math.random() * p.maxLife
      particles.push(p)
    }

    const shouldAnimate = () => isVisible && isIntersecting && !isReducedMotion

    const stopAnimation = () => {
      isRunning = false
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
    }

    const animate = (time: number) => {
      animationId = null

      if (!shouldAnimate()) {
        isRunning = false
        return
      }

      const frameInterval = getFrameInterval()
      if (frameInterval > 0 && time - lastFrameTime < frameInterval) {
        animationId = requestAnimationFrame(animate)
        return
      }

      lastFrameTime = time
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      if (particles.length < getParticleLimits().max && Math.random() > 0.9) {
        particles.push(createParticle())
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++

        const lifeRatio = p.life / p.maxLife
        if (lifeRatio < 0.1) {
          p.opacity = lifeRatio * 10
        } else if (lifeRatio > 0.8) {
          p.opacity = (1 - lifeRatio) * 5
        } else {
          p.opacity = 1
        }

        if (p.life >= p.maxLife || p.y < -10) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 230, 170, ${p.opacity * 0.4})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180, 255, 230, ${p.opacity * 0.8})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (!isRunning && shouldAnimate()) {
        isRunning = true
        animationId = requestAnimationFrame(animate)
      }
    }

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === "visible"
      if (shouldAnimate()) {
        startAnimation()
      } else {
        stopAnimation()
      }
    }

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      isReducedMotion = event.matches
      if (shouldAnimate()) {
        startAnimation()
      } else {
        stopAnimation()
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting
      if (shouldAnimate()) {
        startAnimation()
      } else {
        stopAnimation()
      }
    })

    observer.observe(canvas)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange)

    startAnimation()

    return () => {
      stopAnimation()
      observer.disconnect()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
