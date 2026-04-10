'use client'

import ImageIcon from '@mui/icons-material/Image'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

import { setBranchRandomAction, updateBranchImageAction, updateBranchSettingsAction } from '$/actions/admin'
import { getImageUrl } from '$/actions/media'
import { useSnackbar } from '$/hooks/useSnackbar'
import { track } from '$/lib/analytics'
import { formatDuration } from '$/lib/utils'
import { BranchType, PlaylistUiOption } from '$/types'
import type { Branch } from '$/types'
import TrackList from './TrackList'

type SettingSwitchProps = {
  checked: boolean
  label: string
  tooltip: string
  onChange: (checked: boolean) => void
}

const SettingSwitch = ({ checked, label, tooltip, onChange }: SettingSwitchProps) => (
  <Grid size={4}>
    <Tooltip title={tooltip}>
      <FormControlLabel
        control={<Switch size="small" checked={checked} onChange={(_e, v) => onChange(v)} sx={{ mr: 2 }} />}
        label={label}
      />
    </Tooltip>
  </Grid>
)

type DialogEditPlaylistProps = {
  branch: Branch<BranchType.PLAYLIST>
  open: boolean
  onClose: () => void
}

const DialogEditPlaylist = ({ branch, open, onClose }: DialogEditPlaylistProps) => {
  const [playlistName, setPlaylistName] = useState(branch.name)
  const [nameSaving, setNameSaving] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const imageUrl = localPreview ?? (branch.imagePath ? getImageUrl(branch.imagePath) : null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { showSnackbar } = useSnackbar()
  const [random, setRandom] = useState(branch.random ?? 0)
  const [ui, setUi] = useState<PlaylistUiOption[]>(branch.ui ?? [])
  const [mainDuration, setMainDuration] = useState(0)
  const [randomDuration, setRandomDuration] = useState(0)

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview)
    },
    [localPreview]
  )

  const toggleUiOption = (option: PlaylistUiOption, checked: boolean) => {
    const next = checked ? [...ui, option] : ui.filter((o) => o !== option)
    setUi(next)
    updateBranchSettingsAction(branch.id, { ui: next })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (localPreview) URL.revokeObjectURL(localPreview)
    const previewUrl = URL.createObjectURL(file)
    setLocalPreview(previewUrl)
    e.target.value = ''

    const formData = new FormData()
    formData.set('image', file)
    try {
      const res = await fetch('/api/admin/image', { method: 'POST', body: formData })
      if (!res.ok) {
        URL.revokeObjectURL(previewUrl)
        setLocalPreview(null)
        showSnackbar('Failed to upload image', 'error')
        return
      }
      const { imagePath } = (await res.json()) as { imagePath: string }
      const result = await updateBranchImageAction(branch.id, imagePath)
      if (!result.success) {
        URL.revokeObjectURL(previewUrl)
        setLocalPreview(null)
        showSnackbar(result.error ?? 'Failed to update image', 'error')
      }
    } catch {
      URL.revokeObjectURL(previewUrl)
      setLocalPreview(null)
      showSnackbar('Failed to upload image', 'error')
    }
  }

  return (
    <Dialog open={open} onClose={nameSaving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-evenly" spacing={2}>
          <Stack spacing={2}>
            <TextField
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              onBlur={async () => {
                const trimmed = playlistName.trim()
                if (trimmed && trimmed !== branch.name) {
                  setNameSaving(true)
                  try {
                    const result = await updateBranchSettingsAction(branch.id, { name: trimmed })
                    if (result.success) {
                      track('admin-playlist-update', { branchId: branch.id, name: trimmed })
                    } else {
                      setPlaylistName(branch.name)
                      showSnackbar(result.error ?? 'Failed to rename playlist', 'error')
                    }
                  } catch {
                    setPlaylistName(branch.name)
                    showSnackbar('Failed to rename playlist', 'error')
                  } finally {
                    setNameSaving(false)
                  }
                } else {
                  setPlaylistName(branch.name)
                }
              }}
              variant="standard"
              autoComplete="off"
              slotProps={{
                input: {
                  sx: { fontSize: 'inherit', fontWeight: 'inherit' },
                },
                htmlInput: {
                  sx: { textAlign: 'center' },
                },
              }}
            />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {random && random < 100 ? '~' : null}
              {formatDuration(mainDuration + randomDuration * (random / 100), 'long')}
            </Typography>
          </Stack>
          <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
          <Tooltip title="Change image">
            <IconButton size="large" onClick={() => imageInputRef.current?.click()}>
              {imageUrl ? <Avatar src={imageUrl} sx={{ width: 128, height: 128 }} /> : <ImageIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={3} alignItems="center">
          <SettingSwitch
            checked={ui.includes(PlaylistUiOption.SHUFFLE)}
            label="Shuffle"
            tooltip="Randomize track order on each playback"
            onChange={(checked) => toggleUiOption(PlaylistUiOption.SHUFFLE, checked)}
          />

          <Grid size={8}>
            <Stack direction="row" alignItems="center" gap={2}>
              <Typography color="text.secondary" textAlign="center" sx={{ whiteSpace: 'nowrap' }}>
                Random: {random}%
              </Typography>
              <Slider
                value={random}
                min={0}
                max={100}
                onChange={(_e, v) => setRandom(v as number)}
                onChangeCommitted={async (_e, v) => {
                  const result = await setBranchRandomAction(branch.id, v as number)
                  if (!result.success) setRandom(branch.random ?? 0)
                }}
              />
            </Stack>
          </Grid>

          <SettingSwitch
            checked={ui.includes(PlaylistUiOption.SHOW_CONTROLS_RANDOM)}
            label="Show random control"
            tooltip="Show random percentage slider in the venue player"
            onChange={(checked) => toggleUiOption(PlaylistUiOption.SHOW_CONTROLS_RANDOM, checked)}
          />

          <SettingSwitch
            checked={ui.includes(PlaylistUiOption.SHOW_TRACK_NAMES)}
            label="Show track names"
            tooltip="Display track names in the venue player"
            onChange={(checked) => toggleUiOption(PlaylistUiOption.SHOW_TRACK_NAMES, checked)}
          />

          <SettingSwitch
            checked={ui.includes(PlaylistUiOption.SHOW_CONTROLS_SHUFFLE)}
            label="Show shuffle control"
            tooltip="Show shuffle toggle in the venue player"
            onChange={(checked) => toggleUiOption(PlaylistUiOption.SHOW_CONTROLS_SHUFFLE, checked)}
          />
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Stack
          direction="row"
          divider={<Divider orientation="vertical" flexItem />}
          spacing={2}
          sx={{ minHeight: 0, flex: 1 }}
        >
          <TrackList branchId={branch.id} onDurationChange={setMainDuration} />
          <TrackList branchId={branch.id} pool="random" onDurationChange={setRandomDuration} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={nameSaving}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DialogEditPlaylist
