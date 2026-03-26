import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-[color:var(--primary-border)] bg-primary text-primary-foreground shadow-subtle hover:-translate-y-0.5 hover:bg-primary/92 active:translate-y-0",
        destructive:
          "border border-[color:var(--destructive-border)] bg-destructive text-destructive-foreground shadow-subtle hover:-translate-y-0.5 hover:bg-destructive/90",
        outline:
          "border border-[color:var(--button-outline)] bg-card text-foreground shadow-subtle hover:-translate-y-0.5 hover:bg-muted/40 active:translate-y-0",
        secondary:
          "border border-[color:var(--secondary-border)] bg-secondary text-secondary-foreground shadow-subtle hover:-translate-y-0.5 hover:bg-secondary/88",
        ghost: "border border-transparent bg-transparent text-foreground hover:bg-muted/70",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2.5",
        sm: "min-h-9 rounded-xl px-3.5 text-xs",
        lg: "min-h-12 rounded-2xl px-6 text-sm",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {asChild ? children : <span className="button-content inline-flex items-center gap-2">{renderAnimatedButtonChildren(children)}</span>}
      </Comp>
    )
  }
)
Button.displayName = "Button"

function renderAnimatedButtonChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child, index) => renderButtonChildNode(child, `button-node-${index}`))
}

function renderButtonChildNode(child: React.ReactNode, key: string): React.ReactNode {
  if (typeof child === "string" || typeof child === "number") {
    return (
      <span key={key} className="button-label inline-flex items-center">
        {String(child).split("").map((char, index) => (
          <span
            key={`${key}-${index}`}
            className="button-letter inline-block"
            style={{ whiteSpace: char === " " ? "pre" : undefined }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
    )
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment) {
    return (
      <React.Fragment key={key}>
        {React.Children.map(child.props.children, (fragmentChild, index) =>
          renderButtonChildNode(fragmentChild, `${key}-${index}`),
        )}
      </React.Fragment>
    )
  }

  return child
}

export { Button, buttonVariants }
