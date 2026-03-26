import * as React from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const itemTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: itemTransition,
  },
};

type AssembleGroupProps = {
  children: React.ReactNode;
  className?: string;
};

export function AssembleGroup({ children, className }: AssembleGroupProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {React.Children.map(children, (child, index) =>
        child == null ? null : (
          <motion.div key={getAssembleKey(child, index)} variants={itemVariants}>
            {child}
          </motion.div>
        ),
      )}
    </motion.div>
  );
}

type LoadingTableRowsProps = {
  count: number;
  renderRow: (index: number) => React.ReactNode;
};

export function LoadingTableRows({ count, renderRow }: LoadingTableRowsProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <motion.tr
          key={index}
          variants={itemVariants}
          initial="hidden"
          animate="show"
        >
          {renderRow(index)}
        </motion.tr>
      ))}
    </>
  );
}

type LoadingCardStackProps = {
  count: number;
  className?: string;
  itemClassName?: string;
  renderCard: (index: number) => React.ReactNode;
};

export function LoadingCardStack({
  count,
  className,
  itemClassName,
  renderCard,
}: LoadingCardStackProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div key={index} variants={itemVariants} className={itemClassName}>
          {renderCard(index)}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function LoadingMetricCards({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <LoadingCardStack
      count={count}
      className={className}
      renderCard={() => (
        <div className="rounded-[24px] border border-border/50 bg-card p-5 shadow-subtle">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="mt-4 h-9 w-20 rounded-xl" />
          <Skeleton className="mt-3 h-3 w-32 rounded-full" />
        </div>
      )}
    />
  );
}

export function LoadingTerminalLines({ count }: { count: number }) {
  return (
    <motion.div
      className="space-y-2"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          className="flex flex-col gap-1 rounded px-2 py-2 sm:flex-row sm:items-start sm:gap-4 sm:py-1"
        >
          <Skeleton className="h-3 w-20 rounded-full bg-zinc-800" />
          <Skeleton className="h-3 w-12 rounded-full bg-zinc-800" />
          <Skeleton className="h-3 w-20 rounded-full bg-zinc-800" />
          <Skeleton
            className={cn(
              "h-3 rounded-full bg-zinc-800",
              index % 3 === 0 ? "w-[76%]" : index % 3 === 1 ? "w-[58%]" : "w-[68%]",
            )}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function getAssembleKey(child: React.ReactNode, fallback: number) {
  if (React.isValidElement(child) && child.key != null) {
    return child.key;
  }

  return fallback;
}
