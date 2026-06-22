"use client";

import { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Card className="relative flex min-h-72 flex-col items-center justify-center overflow-hidden py-10 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(191,219,254,0.35),transparent_56%)]" aria-hidden="true" />
      <motion.div
        className="relative mb-5 h-24 w-28 [perspective:700px]"
        animate={reduceMotion ? undefined : { y: [0, -7, 0], rotateY: [-7, 7, -7] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <div className="absolute inset-x-2 bottom-1 h-16 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-100/90 to-indigo-100/70 shadow-[0_18px_30px_rgba(37,99,235,0.16)] [transform:rotateX(58deg)]" />
        <motion.div
          className="absolute left-1/2 top-2 grid h-16 w-16 -translate-x-1/2 place-items-center rounded-2xl border border-white/90 bg-white/75 text-blue-600 shadow-lg backdrop-blur-xl"
          animate={reduceMotion ? undefined : { rotateX: [0, -10, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-8 w-8" />
        </motion.div>
      </motion.div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    </Card>
  );
}
