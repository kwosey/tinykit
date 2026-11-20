import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { initialScene } from '../src/scenes/model'

test('edit, animate, save, reload, restore and export a populated scene', async ({ page, isMobile }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(scene => {
    if (!localStorage.getItem('tinykit.scenes.v1.draft')) {
      localStorage.setItem('tinykit.scenes.v1.draft', JSON.stringify(scene))
      localStorage.setItem('tinykit.scenes.v1.saved', JSON.stringify(scene))
    }
  }, initialScene)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Free scene' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Story beats' })).toHaveCount(0)
  const canvas = page.getByLabel('Scene preview')
  const rect = (await canvas.boundingBox())!
  const x = rect.x + rect.width * 365 / 960
  const y = rect.y + rect.height * 397 / 540

  if (isMobile) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + rect.width / 12, y }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + rect.width / 12, y, { steps: 4 })
    await page.mouse.up()
  }
  await expect(page.getByLabel('Selected object')).toHaveValue('person')
  await expect(page.getByRole('slider', { name: 'X position' })).toHaveValue('444')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('slider', { name: 'X position' })).toHaveValue('364')
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByRole('slider', { name: 'X position' })).toHaveValue('444')
  await page.getByRole('button', { name: 'Lock', exact: true }).click()
  await page.getByRole('button', { name: 'Mutate' }).click()
  await expect(page.getByRole('slider', { name: 'X position' })).toHaveValue('444')
  await page.getByRole('button', { name: 'Night' }).click()
  await page.getByRole('button', { name: 'Keep', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Night' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Desert' }).click()
  await page.getByRole('button', { name: /Collection/ }).click()
  await page.getByRole('button', { name: 'Open Free scene' }).click()
  await expect(page.getByRole('button', { name: 'Night' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(async () => Number(await page.getByLabel('Scrub').inputValue())).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByLabel('Scrub')).toHaveValue('0')
  await page.getByLabel('Scrub').fill('2')
  await expect(page.getByLabel('Scrub')).toHaveValue('2')

  await page.getByLabel('Selected object').selectOption('')
  const expected = await canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL())
  const pngReady = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PNG' }).click()
  const png = await pngReady
  expect(png.suggestedFilename()).toBe('tiny-scene.png')
  const bytes = await readFile((await png.path())!)
  expect(bytes.readUInt32BE(16)).toBe(960)
  expect(bytes.readUInt32BE(20)).toBe(540)
  expect('data:image/png;base64,' + bytes.toString('base64')).toBe(expected)

  const jsonReady = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const json = await jsonReady
  const file = (await json.path())!
  const data = JSON.parse(await readFile(file, 'utf8'))
  expect(data.objects).toHaveLength(5)
  expect(data.environment).toBe('Night')
  await page.getByRole('button', { name: 'Dusk' }).click()
  await page.getByLabel('Import scene file').setInputFiles({ name: 'scene.json', mimeType: 'application/json', buffer: await readFile(file) })
  await expect(page.getByRole('button', { name: 'Night' })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
  expect(errors).toEqual([])
})

test('keeps unreadable drafts, prototype data and collection items intact', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tinykit.scenes.v2.draft', '{bad draft')
    localStorage.setItem('tinykit.scenes.v2.kept.bad', '{bad kept item')
    localStorage.setItem('tinykit.scene.v1', '{old prototype data')
    localStorage.setItem('tinykit.scenes.v1.saved', '{bad save')
  })
  await page.goto('/')
  await expect(page.getByText('The current draft could not be read.')).toBeVisible()
  await page.getByRole('button', { name: 'Keep', exact: true }).click()
  await page.getByRole('button', { name: /Collection/ }).click()
  await expect(page.getByText('1 unreadable collection entries were preserved.')).toBeVisible()
  await page.getByRole('button', { name: 'Open v0.1 save' }).click()
  await expect(page.getByRole('status')).toContainText('Could not open the v0.1 save')
  expect(await page.evaluate(() => [
    localStorage.getItem('tinykit.scenes.v2.draft'), localStorage.getItem('tinykit.scenes.v2.kept.bad'),
    localStorage.getItem('tinykit.scene.v1'), localStorage.getItem('tinykit.scenes.v1.saved'),
  ])).toEqual(['{bad draft', '{bad kept item', '{old prototype data', '{bad save'])
})
