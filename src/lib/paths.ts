import 'server-only'

export const getTempDir = () => {
  const dir = process.env.UPLOAD_TMP_DIR
  if (!dir) throw new Error('UPLOAD_TMP_DIR must be set')
  return dir
}
