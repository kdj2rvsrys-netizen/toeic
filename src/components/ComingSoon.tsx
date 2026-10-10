import type { ReactNode } from 'react'

interface Props {
  title: string
  children?: ReactNode
}

/**
 * 用來標示「此功能於後續階段實作」的區塊。
 * Phase 1 刻意不放假資料或假互動，只誠實呈現尚未接線。
 */
export default function ComingSoon({ title, children }: Props) {
  return (
    <section className="card coming-soon">
      <h2 className="card__title">{title}</h2>
      <p className="coming-soon__badge">🚧 規劃中・後續階段實作</p>
      {children ? <div className="coming-soon__body">{children}</div> : null}
    </section>
  )
}
