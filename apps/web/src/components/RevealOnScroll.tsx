'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type RevealOnScrollProps = Omit<HTMLMotionProps<'div'>, 'children'> & {
  children: ReactNode
  delay?: number
  /** Pixels of negative root margin — fires after this much of the element is visible. */
  threshold?: number
}

/**
 * Section-level scroll reveal. Renders a server-tree of children inside a
 * client-side motion wrapper. Animates once, no re-trigger.
 */
export function RevealOnScroll({
  children,
  delay = 0,
  threshold = 80,
  className,
  ...rest
}: RevealOnScrollProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: `-${threshold}px` }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1]
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
