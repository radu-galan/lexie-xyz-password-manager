import { useRef, useState } from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'

export default function JsonToolbar({ entries, translations, onReplace }) {
    const fileInputRef = useRef(null)
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        await navigator.clipboard.writeText(JSON.stringify(entries))
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    function handleDownload() {
        const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'passwords.json'
        link.click()
        // Not right away: Firefox can still be starting the download.
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    function handleFileChange(event) {
        const file = event.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            let parsed
            try {
                parsed = JSON.parse(String(reader.result))
            } catch {
                // Not JSON: entries stay untouched, but say so.
                window.alert(translations.LANG_IMPORT_INVALID_FILE)
                return
            }
            // Outside the try: an error in onReplace isn't an invalid file.
            if (Array.isArray(parsed)) onReplace(parsed)
            else window.alert(translations.LANG_IMPORT_INVALID_FILE)
        }
        reader.readAsText(file)
        event.target.value = ''
    }

    return (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" startIcon={<InsertDriveFileOutlinedIcon />} onClick={() => onReplace([])}>
                {translations.LANG_NEW}
            </Button>
            <Tooltip title={copied ? translations.LANG_COPIED : ''} open={copied}>
                <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopy}>
                    {translations.LANG_COPY}
                </Button>
            </Tooltip>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
                {translations.LANG_DOWNLOAD}
            </Button>
            <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current?.click()}>
                {translations.LANG_LOAD_FILE}
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChange} />
        </Stack>
    )
}
