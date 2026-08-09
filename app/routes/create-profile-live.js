const path = require('path')
const { FileUpload, getUploadedFiles } = require('../helpers/FileUpload')

const upload = new FileUpload({
  fieldName: 'createProfileLive[photo]',
  allowedTypes: ['image/png', 'image/jpeg'],
  maxFileSize: 1024 * 1024,
  errors: {
    FILE_TYPE:       (filename) => `${filename} must be a PNG or JPG`,
    LIMIT_FILE_SIZE: (filename) => `${filename} must be smaller than 1MB`,
    NO_FILE:         () => 'Select a photo'
  }
})

function uploadError(message) {
  return {
    errorSummary: { items: [{ text: message, href: '#createProfileLive-photo' }] },
    inlineErrors: { photo: { text: message } },
    errorHighlights: {}
  }
}

const GRACE_MS = 5000

// Presence pings are written on every status poll (every 2s), so they're
// kept out of session.data to avoid racing with the secondary "device"'s
// session writes (continuingOnOtherDevice, photoCorrect, etc.) when both
// are polling/posting around the same time.
const presence = new Map()

function getPresence(req) {
  let p = presence.get(req.sessionID)
  if (!p) {
    p = { primaryLastSeen: 0, secondaryLastSeen: 0 }
    presence.set(req.sessionID, p)
  }
  return p
}

// Live-connection result state lives in session.data.createProfileLive.live
// so it resets along with the rest of the prototype's data when "Clear
// data" is used.
function getLiveSession(req) {
  req.session.data.createProfileLive = req.session.data.createProfileLive || {}
  let liveSession = req.session.data.createProfileLive.live
  if (!liveSession) {
    liveSession = { uploaded: false, cancelled: false, photoFilename: null }
    req.session.data.createProfileLive.live = liveSession
  }
  return liveSession
}

function resetLiveSession(req) {
  req.session.data.createProfileLive = req.session.data.createProfileLive || {}
  req.session.data.createProfileLive.live = { uploaded: false, cancelled: false, photoFilename: null }
  presence.delete(req.sessionID)
}

module.exports = router => {

  // Step 1 — Name
  router.get('/demos/create-profile-live', (req, res) => {
    res.render('demos/create-profile-live/index.html')
  })
  router.post('/demos/create-profile-live', (req, res) => {
    res.redirect('/demos/create-profile-live/upload')
  })

  // Step 3a — QR code
  router.get('/demos/create-profile-live/qr-code', (req, res) => {
    if (!getLiveSession(req).uploaded) {
      resetLiveSession(req)
    }
    res.render('demos/create-profile-live/qr-code.html')
  })

  // Step 3a — Simulate scanning the QR code and continuing on another device
  router.get('/demos/create-profile-live/qr-code/continue-on-other-device', getUploadedFiles(upload.fieldName), (req, res) => {
    req.session.data.createProfileLive = req.session.data.createProfileLive || {}
    req.session.data.createProfileLive.continuingOnOtherDevice = true
    req.uploadedFiles.length = 0
    res.redirect('/demos/create-profile-live/upload')
  })

  router.post('/demos/create-profile-live/qr-code', getUploadedFiles(upload.fieldName), (req, res) => {
    if (req.uploadedFiles.length === 0) {
      return res.redirect('/demos/create-profile-live/qr-code-no-photo')
    }
    req.session.data.createProfileLive.continuingOnOtherDevice = false
    res.redirect('/demos/create-profile-live/check')
  })

  // The "continue on this device instead" action from the waiting screen.
  // Ends the live connection so the secondary device can be told the
  // session has finished, then carries on with the upload on this device.
  router.post('/demos/create-profile-live/cancel-other-device', (req, res) => {
    getLiveSession(req).cancelled = true
    res.redirect('/demos/create-profile-live/upload')
  })
  router.get('/demos/create-profile-live/cancel-other-device', (req, res) => {
    getLiveSession(req).cancelled = true
    res.redirect('/demos/create-profile-live/upload')
  })

  // Step 3a-i — No photo received yet
  router.get('/demos/create-profile-live/qr-code-no-photo', (req, res) => {
    res.render('demos/create-profile-live/qr-code-no-photo.html')
  })

  // Step 3b — Email address
  router.get('/demos/create-profile-live/email', (req, res) => {
    res.render('demos/create-profile-live/email.html')
  })
  router.post('/demos/create-profile-live/email', (req, res) => {
    resetLiveSession(req)
    res.redirect('/demos/create-profile-live/email-sent')
  })

  // Step 3c — Email sent
  router.get('/demos/create-profile-live/email-sent', (req, res) => {
    res.render('demos/create-profile-live/email-sent.html')
  })
  router.post('/demos/create-profile-live/email-sent', getUploadedFiles(upload.fieldName), (req, res) => {
    if (req.uploadedFiles.length === 0) {
      return res.redirect('/demos/create-profile-live/email-no-photo')
    }
    req.session.data.createProfileLive.continuingOnOtherDevice = false
    res.redirect('/demos/create-profile-live/check')
  })

  // Step 3c-i — No photo received yet (email)
  router.get('/demos/create-profile-live/email-no-photo', (req, res) => {
    res.render('demos/create-profile-live/email-no-photo.html')
  })

  // Step 3c-ii — View the email and follow its link to continue on another device
  router.get('/demos/create-profile-live/link', (req, res) => {
    res.render('demos/create-profile-live/link.html')
  })

  // Step 3d — Simulate following the link from the email on another device
  router.get('/demos/create-profile-live/link/continue-on-other-device', getUploadedFiles(upload.fieldName), (req, res) => {
    req.session.data.createProfileLive = req.session.data.createProfileLive || {}
    req.session.data.createProfileLive.continuingOnOtherDevice = true
    req.uploadedFiles.length = 0
    res.redirect('/demos/create-profile-live/upload')
  })

  // Step 4 — Upload photo
  router.get('/demos/create-profile-live/upload', (req, res) => {
    res.render('demos/create-profile-live/upload.html')
  })

  router.post('/demos/create-profile-live/upload', getUploadedFiles(upload.fieldName), async (req, res) => {
    const { uploaded, rejected, aborted } = await upload.parse(req)
    if (aborted) return

    const realRejections = rejected.filter(r => r.error.code !== 'NO_FILE')
    if (realRejections.length > 0) {
      req.flash('error', uploadError(realRejections[0].error.message))
      return res.redirect('/demos/create-profile-live/upload')
    }

    if (uploaded.length === 0) {
      req.flash('error', uploadError('Select a photo'))
      return res.redirect('/demos/create-profile-live/upload')
    }

    req.uploadedFiles.length = 0
    req.uploadedFiles.push(uploaded[0])
    return res.redirect('/demos/create-profile-live/check-photo')
  })

  router.get('/demos/create-profile-live/file/:filename', (req, res) => {
    res.sendFile(path.join(process.cwd(), '.tmp/uploads', req.params.filename))
  })

  // Step 5 — Check photo
  router.get('/demos/create-profile-live/check-photo', getUploadedFiles(upload.fieldName), (req, res) => {
    res.render('demos/create-profile-live/check-photo.html', { uploadedFiles: req.uploadedFiles })
  })
  router.post('/demos/create-profile-live/check-photo', (req, res) => {
    const photoCorrect = (req.session.data.createProfileLive || {}).photoCorrect
    if (photoCorrect === 'no') {
      return res.redirect('/demos/create-profile-live/upload')
    }
    if ((req.session.data.createProfileLive || {}).continuingOnOtherDevice) {
      return res.redirect('/demos/create-profile-live/photo-uploaded')
    }
    res.redirect('/demos/create-profile-live/check')
  })

  // Step 5a — Photo uploaded on other device
  router.get('/demos/create-profile-live/photo-uploaded', getUploadedFiles(upload.fieldName), (req, res) => {
    const liveSession = getLiveSession(req)
    liveSession.uploaded = true
    liveSession.photoFilename = req.uploadedFiles[0] && req.uploadedFiles[0].filename
    res.render('demos/create-profile-live/photo-uploaded.html')
  })

  // Polled by both devices to find out about each other and report progress
  router.get('/demos/create-profile-live/status', (req, res) => {
    const liveSession = getLiveSession(req)
    const presenceState = getPresence(req)
    const now = Date.now()

    if (req.query.role === 'primary') {
      presenceState.primaryLastSeen = now
    } else if (req.query.role === 'secondary') {
      presenceState.secondaryLastSeen = now
    }

    res.json({
      primaryConnected: (now - presenceState.primaryLastSeen) < GRACE_MS,
      secondaryConnected: (now - presenceState.secondaryLastSeen) < GRACE_MS,
      uploaded: liveSession.uploaded,
      cancelled: liveSession.cancelled,
      photoFilename: liveSession.photoFilename
    })
  })

  // Step 6 — Check answers
  router.get('/demos/create-profile-live/check', getUploadedFiles(upload.fieldName), (req, res) => {
    res.render('demos/create-profile-live/check.html', { uploadedFiles: req.uploadedFiles })
  })
  router.post('/demos/create-profile-live/check', (req, res) => {
    req.session.data.createProfileLive = {}
    res.redirect('/demos/create-profile-live')
  })

}
