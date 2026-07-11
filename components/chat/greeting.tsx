import { motion } from "framer-motion";

export const Greeting = () => (
  <div className="flex flex-col items-center px-4" key="overview">
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="text-center font-semibold text-2xl tracking-tight text-foreground md:text-3xl"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      What can I help with?
    </motion.div>
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 max-w-md text-center text-muted-foreground/60 text-sm leading-relaxed"
      initial={{ opacity: 0, y: 10 }}
      transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      Ask me anything — I can help with writing, analysis, coding, math, and
      much more.
    </motion.div>
  </div>
);
