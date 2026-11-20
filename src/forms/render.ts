import { HEIGHT, sampleFrame, WIDTH } from './effects'
import { palettes, type Composition } from './model'

export function renderComposition(ctx: CanvasRenderingContext2D, composition: Composition, time: number) {
  const [background, ...ink] = palettes[composition.palette]
  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 10, WIDTH / 2, HEIGHT / 2, WIDTH * 0.55)
  vignette.addColorStop(0, background)
  vignette.addColorStop(1, '#0b0c11')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // A static reference grid makes the moving geometry and its scale easier to read.
  ctx.fillStyle = '#ffffff20'
  for (let y = 30; y < HEIGHT; y += 30) {
    for (let x = 30; x < WIDTH; x += 30) ctx.fillRect(x, y, 1, 1)
  }

  for (const mark of sampleFrame(composition, time)) {
    const radius = mark.size / 2
    const width = mark.size * (mark.aspect ?? 1.25)
    ctx.save()
    ctx.translate(mark.x + WIDTH / 2, mark.y + HEIGHT / 2)
    ctx.rotate(mark.rotation)
    ctx.globalAlpha = mark.opacity
    ctx.fillStyle = ctx.strokeStyle = ink[mark.ink % ink.length]
    ctx.beginPath()
    switch (composition.shape) {
      case 'Circle':
        ctx.arc(0, 0, radius, 0, 2 * Math.PI)
        ctx.lineWidth = 1.35
        ctx.stroke()
        break
      case 'Dot':
        ctx.arc(0, 0, radius, 0, 2 * Math.PI)
        ctx.fill()
        break
      case 'Triangle':
        ctx.moveTo(width * 0.55, 0)
        ctx.lineTo(-width * 0.44, radius)
        ctx.lineTo(-width * 0.44, -radius)
        ctx.closePath()
        ctx.fill()
        break
      case 'Rectangle':
        ctx.fillRect(-width / 2, -radius, width, mark.size)
        break
      case 'Rounded':
        ctx.roundRect(-width / 2, -radius, width, mark.size, radius)
        ctx.fill()
        break
      case 'Line':
        ctx.lineWidth = Math.max(1, mark.size * 0.23)
        ctx.lineCap = 'round'
        ctx.moveTo(-width / 2, 0)
        ctx.lineTo(width / 2, 0)
        ctx.stroke()
        break
    }
    ctx.restore()
  }
}
