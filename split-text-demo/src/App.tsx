import SplitText from './components/SplitText'

export default function App() {
  return (
    <main className="grid min-h-screen place-items-center bg-neutral-950 p-8 text-white">
      <SplitText
        text="Hello, you!"
        className="text-6xl font-semibold sm:text-8xl"
        delay={22}
        duration={0.45}
        ease="power3.out"
        splitType="chars"
        from={{ opacity: 0, y: 40 }}
        to={{ opacity: 1, y: 0 }}
        threshold={0.1}
        rootMargin="-100px"
        textAlign="center"
        loop
        loopDelay={0.5}
      />
    </main>
  )
}
