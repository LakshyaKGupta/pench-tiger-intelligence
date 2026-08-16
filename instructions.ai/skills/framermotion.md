# Skill: Framer Motion

Use this skill to implement professional, production-grade Framer Motion animations in React/Next.js systems.

## 1. Declarative Variants
- **Use Variants**: Avoid nesting inline animation objects. Define clean, descriptive variants on parent wrappers and let children inherit stagger options.
  ```tsx
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };
  ```

## 2. Layout Transitions (`layoutId`)
- **Visual Continuity**: Use the `layoutId` attribute on elements to smoothly morph/transition them when active states or page tabs switch.
  ```tsx
  {activeTab === tab.id && (
    <motion.div
      layoutId="active-indicator"
      className="absolute inset-0 bg-neutral-100 rounded-lg"
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    />
  )}
  ```
- **Layout Animations**: Add the `layout` prop to containers whose layout changes (e.g. lists where items can be re-ordered, expanded accordion cards) to animate sizing smoothly.

## 3. Gestures & Mount Lifecycle
- **Interactive State Props**: Leverage `whileHover`, `whileTap`, and `whileFocus` instead of manually setting React listeners to animate buttons.
- **Animate Presence**: Wrap conditionally-rendered modals, alerts, and tooltips in `<AnimatePresence>` to allow elegant enter and exit animations. Always define an `exit` prop on children.
  ```tsx
  <AnimatePresence mode="wait">
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      />
    )}
  </AnimatePresence>
  ```
