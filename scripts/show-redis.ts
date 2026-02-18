#!/usr/bin/env -S tsx
import chalk from 'chalk'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

const shortId = (id: string) => chalk.dim(id.slice(0, 8))

const printBranch = async (branchId: string, indent: number) => {
  const branch = await redis.hgetall(`branch:${branchId}`)
  if (!branch.id) return

  const prefix = '  '.repeat(indent)
  const icon = branch.type === 'FOLDER' ? '📁' : '🎵'
  console.log(`${prefix}${icon} ${chalk.bold(branch.name)} ${shortId(branch.id)} ${chalk.dim(branch.type)}`)

  if (branch.type === 'PLAYLIST') {
    const trackIds = await redis.lrange(`branch:${branchId}:tracks`, 0, -1)
    for (const trackId of trackIds) {
      const track = await redis.hgetall(`track:${trackId}`)
      if (!track.id) continue
      const dur = parseFloat(track.duration || '0')
      const m = Math.floor(dur / 60)
      const s = Math.floor(dur % 60)
      console.log(
        `${prefix}  ♪ ${track.title} ${chalk.dim(`— ${track.artist || 'Unknown'}`)} ${chalk.dim(`${m}:${s.toString().padStart(2, '0')}`)} ${shortId(track.id)}`
      )
    }
  } else {
    const childIds = await redis.lrange(`branch:${branchId}:children`, 0, -1)
    for (const childId of childIds) {
      await printBranch(childId, indent + 1)
    }
  }
}

const showRedis = async () => {
  // Users
  const userKeys = await redis.keys('user:*')
  const userIds = userKeys.filter((k) => !k.includes(':byUsername')).map((k) => k.replace('user:', ''))

  console.log(chalk.cyan(`\n═══ Users (${userIds.length}) ═══`))
  for (const id of userIds) {
    const user = await redis.hgetall(`user:${id}`)
    if (!user.id) continue
    const role = user.role === 'ADMIN' ? chalk.magenta('admin') : chalk.green('user')
    console.log(`  ${chalk.bold(user.username)} ${shortId(user.id)} ${role} ${chalk.dim(user.createdAt)}`)
  }

  // Venues
  const venueIds = await redis.smembers('venues')

  console.log(chalk.yellow(`\n═══ Venues (${venueIds.length}) ═══`))
  for (const venueId of venueIds) {
    const venue = await redis.hgetall(`venue:${venueId}`)
    if (!venue.id) continue

    console.log(`\n  ${chalk.bold(venue.name)} ${shortId(venue.id)} ${chalk.dim(venue.createdAt)}`)
    if (venue.description) console.log(`  ${chalk.dim(venue.description)}`)

    // Venue users
    const venueUserIds = await redis.smembers(`venue:${venueId}:users`)
    if (venueUserIds.length > 0) {
      const names: string[] = []
      for (const uid of venueUserIds) {
        const u = await redis.hgetall(`user:${uid}`)
        names.push(u.username || uid.slice(0, 8))
      }
      console.log(`  ${chalk.dim('Users:')} ${names.join(', ')}`)
    }

    // Branch tree
    const rootBranchIds = await redis.lrange(`venue:${venueId}:branches`, 0, -1)
    if (rootBranchIds.length > 0) {
      console.log(`  ${chalk.dim('Branches:')}`)
      for (const branchId of rootBranchIds) {
        await printBranch(branchId, 2)
      }
    }
  }

  console.log()
  await redis.quit()
}

showRedis().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
