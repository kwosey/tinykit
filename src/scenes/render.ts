import { HEIGHT, WIDTH, type Scene, type SceneObject } from './model'
import { poseAt } from './motion'

const palettes = {
  Dusk: ['#443b4b', '#c58270', '#f4bc83', '#886375', '#6d515e', '#40383c', '#504347', '#a07766'],
  Desert: ['#8b5c60', '#e0a073', '#ffcf89', '#b77c61', '#93614f', '#583d39', '#705045', '#ba8866'],
  Night: ['#22263d', '#67566a', '#e9cda3', '#535169', '#3e4057', '#2e303e', '#393847', '#8a7274'],
}

const bounds = {
  Person: [-21, -83, 21, 3], Building: [-65, -138, 65, 3], Tree: [-42, -112, 42, 3],
  Car: [-65, -48, 65, 5], Text: [-180, -36, 180, 5],
}

function shape(ctx: CanvasRenderingContext2D, color: string, ...points: number[]) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(points[0], points[1])
  for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index], points[index + 1])
  ctx.closePath()
  ctx.fill()
}

function circle(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, radius: number) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.fill()
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, width, height)
}

function backdrop(ctx: CanvasRenderingContext2D, environment: Scene['environment']) {
  const [top, bottom, sun, far, near, ground, road, marking] = palettes[environment]
  const gradient = ctx.createLinearGradient(0, 0, 0, 425)
  gradient.addColorStop(0, top)
  gradient.addColorStop(1, bottom)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  circle(ctx, sun, 279, 174, 64)
  if (environment === 'Night') {
    for (const [x, y] of [[113, 78], [221, 90], [461, 100], [578, 59], [663, 146], [765, 90], [868, 147], [927, 61]]) {
      circle(ctx, sun, x, y, 1.8)
    }
  } else {
    for (const [x, y, width] of [[116, 140, 58], [522, 155, 92], [745, 114, 122], [819, 128, 84]]) {
      rect(ctx, '#efd0b333', x, y, width, 3)
    }
  }
  shape(ctx, far, 0, 319, 117, 248, 191, 271, 317, 207, 421, 281, 548, 235, 639, 249, 745, 199, 960, 292, 960, 470, 0, 470)
  shape(ctx, near, 0, 342, 155, 283, 220, 308, 340, 279, 466, 330, 584, 272, 685, 302, 805, 250, 960, 325, 960, 470, 0, 470)
  shape(ctx, ground, 0, 397, 142, 379, 301, 389, 482, 357, 644, 377, 810, 366, 960, 389, 960, 540, 0, 540)
  shape(ctx, road, 0, 471, 960, 425, 960, 491, 0, 540)
  ctx.strokeStyle = marking
  ctx.lineWidth = 2
  ctx.setLineDash([28, 31])
  ctx.beginPath()
  ctx.moveTo(0, 508)
  ctx.lineTo(960, 456)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawObject(ctx: CanvasRenderingContext2D, object: SceneObject, stride: number) {
  const { color } = object
  switch (object.kind) {
    case 'Tree':
      rect(ctx, '#503e39', -5, -60, 10, 60)
      shape(ctx, '#51554b', -41, -29, 0, -112, 41, -29)
      shape(ctx, color, -34, -47, 0, -112, 24, -47)
      shape(ctx, '#66715d', -29, -36, 2, -88, 35, -36)
      break
    case 'Building':
      rect(ctx, color, -64, -110, 128, 110)
      shape(ctx, '#3c303c', -65, -110, -48, -138, 51, -138, 65, -110)
      rect(ctx, '#523c47', 35, -110, 29, 110)
      rect(ctx, '#4b3840', -12, -38, 26, 38)
      for (const x of [-47, -9, 29]) {
        rect(ctx, '#43353f', x - 2, -90, 22, 27)
        rect(ctx, '#e7a874', x, -88, 18, 22)
        rect(ctx, '#936759', x + 8, -88, 2, 22)
      }
      break
    case 'Car':
      shape(ctx, color, -63, -13, -63, -30, -39, -34, -23, -48, 23, -48, 44, -32, 61, -28, 65, -13)
      shape(ctx, '#4d4650', -33, -33, -19, -44, -3, -44, -3, -33)
      shape(ctx, '#4d4650', 3, -33, 3, -44, 20, -44, 35, -33)
      rect(ctx, '#f5c58b', 54, -25, 8, 6)
      for (const x of [-40, 41]) {
        circle(ctx, '#28252b', x, -13, 12)
        circle(ctx, '#8b7470', x, -13, 5)
      }
      break
    case 'Person':
      ctx.lineWidth = 7
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#382e3b'
      ctx.beginPath()
      ctx.moveTo(-6, -29)
      ctx.lineTo(-9 + 11 * stride, -4)
      ctx.moveTo(6, -29)
      ctx.lineTo(10 - 11 * stride, -4)
      ctx.stroke()
      shape(ctx, color, -11, -62, 10, -62, 17, -29, -15, -29)
      circle(ctx, '#edbf9a', 0, -72, 10)
      shape(ctx, '#453340', -12, -74, -9, -83, 8, -83, 13, -74)
      break
    case 'Text':
      ctx.fillStyle = color
      ctx.font = 'bold 32px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText(object.text, 0, -5, 350)
      break
  }
}

export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene, time: number, selected?: string) {
  const change = scene.environmentChange
  backdrop(ctx, change && time >= change.time ? change.to : scene.environment)
  for (const object of scene.objects) {
    const pose = poseAt(object, time)
    ctx.save()
    ctx.translate(pose.x, pose.y)
    ctx.rotate(pose.rotation)
    ctx.scale(pose.size, pose.size)
    ctx.globalAlpha = pose.opacity
    drawObject(ctx, object, pose.stride)
    ctx.restore()
  }
  const object = scene.objects.find(candidate => candidate.id === selected)
  if (object) {
    const pose = poseAt(object, time)
    const [left, top, right, bottom] = bounds[object.kind]
    ctx.save()
    ctx.translate(pose.x, pose.y)
    ctx.rotate(pose.rotation)
    ctx.scale(pose.size, pose.size)
    ctx.strokeStyle = '#fff1c8'
    ctx.lineWidth = 1.5 / pose.size
    ctx.setLineDash([4, 4])
    ctx.strokeRect(left - 5, top - 5, right - left + 10, bottom - top + 10)
    ctx.restore()
  }
}

export function hitObject(scene: Scene, x: number, y: number, time: number) {
  return scene.objects.findLast(object => {
    const pose = poseAt(object, time)
    if (pose.opacity <= 0.03) return false
    const dx = (x - pose.x) / pose.size
    const dy = (y - pose.y) / pose.size
    const localX = dx * Math.cos(pose.rotation) + dy * Math.sin(pose.rotation)
    const localY = -dx * Math.sin(pose.rotation) + dy * Math.cos(pose.rotation)
    const [left, top, right, bottom] = bounds[object.kind]
    return localX >= left - 7 && localX <= right + 7 && localY >= top - 7 && localY <= bottom + 7
  })
}
