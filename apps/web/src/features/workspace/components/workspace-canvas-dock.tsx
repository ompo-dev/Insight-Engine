import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CanvasDockSurface,
  CanvasToolButton,
} from "@/features/workspace/components/canvas-chrome-controls";
import { cn } from "@/lib/utils";

export type WorkspaceCanvasDockAction = {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
};

export function WorkspaceCanvasDock({
  actions,
  orientation = "vertical",
  splitAfter,
  className,
  animation = "none",
}: {
  actions: WorkspaceCanvasDockAction[];
  orientation?: "horizontal" | "vertical";
  splitAfter?: number;
  className?: string;
  animation?: "none" | "node-focus";
}) {
  const primaryActions =
    typeof splitAfter === "number" && splitAfter > 0 ? actions.slice(0, splitAfter) : actions;
  const secondaryActions =
    typeof splitAfter === "number" && splitAfter > 0 ? actions.slice(splitAfter) : [];
  const separatorClassName =
    orientation === "horizontal" ? "h-8 w-px self-center bg-white/8" : "my-1 h-px w-8 bg-white/8";
  const groupClassName =
    orientation === "horizontal"
      ? "flex flex-row items-center gap-2"
      : "flex flex-col items-center gap-2";
  const animated =
    animation === "node-focus" && orientation === "horizontal" && actions.length > 0;
  const animationSignature = useMemo(
    () => actions.map((action) => action.id).join("|"),
    [actions],
  );
  const [revealedCount, setRevealedCount] = useState(animated ? 1 : actions.length);

  useEffect(() => {
    if (!animated) {
      setRevealedCount(actions.length);
      return;
    }

    setRevealedCount(1);
    const timers = actions.slice(1).map((_, index) =>
      window.setTimeout(() => {
        setRevealedCount(index + 2);
      }, 120 + index * 65),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [actions.length, animated, animationSignature]);

  const visiblePrimaryActions = useMemo(() => {
    if (!animated) return primaryActions;
    return primaryActions.slice(0, Math.min(revealedCount, primaryActions.length));
  }, [animated, primaryActions, revealedCount]);

  const visibleSecondaryActions = useMemo(() => {
    if (!animated) return secondaryActions;
    return secondaryActions.slice(0, Math.max(0, revealedCount - primaryActions.length));
  }, [animated, primaryActions.length, revealedCount, secondaryActions]);

  const content = (
    <>
      <div className={groupClassName}>
        {visiblePrimaryActions.map((action, index) =>
          animated ? (
            <motion.div
              key={action.id}
              layout
              initial={index === 0 ? false : { opacity: 0, x: -16, scale: 0.86 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.92 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <CanvasToolButton
                icon={action.icon}
                label={action.label}
                active={Boolean(action.active)}
                onClick={action.onClick}
              />
            </motion.div>
          ) : (
            <CanvasToolButton
              key={action.id}
              icon={action.icon}
              label={action.label}
              active={Boolean(action.active)}
              onClick={action.onClick}
            />
          ),
        )}
      </div>

      {animated ? (
        <AnimatePresence initial={false}>
          {visibleSecondaryActions.length ? (
            <motion.div
              layout
              initial={{ opacity: 0, x: -10, scaleY: 0.7 }}
              animate={{ opacity: 1, x: 0, scaleY: 1 }}
              exit={{ opacity: 0, x: -8, scaleY: 0.8 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className={separatorClassName}
            />
          ) : null}
        </AnimatePresence>
      ) : secondaryActions.length ? (
        <div className={separatorClassName} />
      ) : null}

      {(animated ? visibleSecondaryActions.length : secondaryActions.length) ? (
        <div className={groupClassName}>
          {(animated ? visibleSecondaryActions : secondaryActions).map((action) =>
            animated ? (
              <motion.div
                key={action.id}
                layout
                initial={{ opacity: 0, x: -16, scale: 0.86 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.92 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <CanvasToolButton
                  icon={action.icon}
                  label={action.label}
                  active={Boolean(action.active)}
                  onClick={action.onClick}
                />
              </motion.div>
            ) : (
              <CanvasToolButton
                key={action.id}
                icon={action.icon}
                label={action.label}
                active={Boolean(action.active)}
                onClick={action.onClick}
              />
            ),
          )}
        </div>
      ) : null}
    </>
  );

  if (animated) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -18, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "rounded-[26px] border border-white/10 bg-[#16181d]/94 shadow-[0_20px_44px_rgba(0,0,0,0.34)] backdrop-blur-2xl",
          "flex w-fit max-w-full items-center gap-2 overflow-hidden px-2 py-2",
          className,
        )}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <CanvasDockSurface orientation={orientation} className={className}>
      {content}
    </CanvasDockSurface>
  );
}
