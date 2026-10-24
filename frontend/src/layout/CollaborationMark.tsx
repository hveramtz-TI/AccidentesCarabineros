import carabinerosLogo from "@/assets/logoCarabineros.svg"
import logoHv from "@/assets/logoHV 1.svg"

interface Props {
  compact?: boolean
}

export default function CollaborationMark({ compact = false }: Props) {
  const imageHeight = compact ? "h-6" : "h-10"

  return (
    <span
      role="img"
      aria-label="Colaboración entre Carabineros de Chile y logoHV"
      className="inline-flex shrink-0 items-center gap-2"
    >
      <img
        src={carabinerosLogo}
        alt=""
        width={782}
        height={364}
        className={`${imageHeight} w-auto max-w-20 object-contain`}
      />
      <span aria-hidden="true" className="font-heading text-sm font-semibold text-muted-foreground">
        ×
      </span>
      <img
        src={logoHv}
        alt=""
        width={386}
        height={293}
        className={`${imageHeight} w-auto max-w-16 object-contain invert`}
      />
    </span>
  )
}
