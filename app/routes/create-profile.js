const path = require('path')
const { FileUpload, getUploadedFiles } = require('../helpers/FileUpload')

const upload = new FileUpload({
  fieldName: 'createProfile[photo]',
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
    errorSummary: { items: [{ text: message, href: '#createProfile-photo' }] },
    inlineErrors: { photo: { text: message } },
    errorHighlights: {}
  }
}

module.exports = router => {

  // Step 1 — Name
  router.get('/demos/create-profile', (req, res) => {
    res.render('demos/create-profile/index.html')
  })
  router.post('/demos/create-profile', (req, res) => {
    res.redirect('/demos/create-profile/upload')
  })

  // Step 3a — QR code
  router.get('/demos/create-profile/qr-code', (req, res) => {
    res.render('demos/create-profile/qr-code.html')
  })

  // Step 3a — Simulate scanning the QR code and continuing on another device
  router.get('/demos/create-profile/qr-code/continue-on-other-device', getUploadedFiles(upload.fieldName), (req, res) => {
    req.session.data.createProfile = req.session.data.createProfile || {}
    req.session.data.createProfile.continuingOnOtherDevice = true
    req.uploadedFiles.length = 0
    res.redirect('/demos/create-profile/upload')
  })

  router.post('/demos/create-profile/qr-code', getUploadedFiles(upload.fieldName), (req, res) => {
    if (req.uploadedFiles.length === 0) {
      return res.redirect('/demos/create-profile/qr-code-no-photo')
    }
    req.session.data.createProfile.continuingOnOtherDevice = false
    res.redirect('/demos/create-profile/check')
  })

  // Step 3a-i — No photo received yet
  router.get('/demos/create-profile/qr-code-no-photo', (req, res) => {
    res.render('demos/create-profile/qr-code-no-photo.html')
  })

  // Step 3b — Email address
  router.get('/demos/create-profile/email', (req, res) => {
    res.render('demos/create-profile/email.html')
  })
  router.post('/demos/create-profile/email', (req, res) => {
    res.redirect('/demos/create-profile/email-sent')
  })

  // Step 3c — Email sent
  router.get('/demos/create-profile/email-sent', (req, res) => {
    res.render('demos/create-profile/email-sent.html')
  })
  router.post('/demos/create-profile/email-sent', getUploadedFiles(upload.fieldName), (req, res) => {
    if (req.uploadedFiles.length === 0) {
      return res.redirect('/demos/create-profile/email-no-photo')
    }
    req.session.data.createProfile.continuingOnOtherDevice = false
    res.redirect('/demos/create-profile/check')
  })

  // Step 3c-i — No photo received yet (email)
  router.get('/demos/create-profile/email-no-photo', (req, res) => {
    res.render('demos/create-profile/email-no-photo.html')
  })

  // Step 3c-ii — View the email and follow its link to continue on another device
  router.get('/demos/create-profile/link', (req, res) => {
    res.render('demos/create-profile/link.html')
  })

  // Step 3d — Simulate following the link from the email on another device
  router.get('/demos/create-profile/link/continue-on-other-device', getUploadedFiles(upload.fieldName), (req, res) => {
    req.session.data.createProfile = req.session.data.createProfile || {}
    req.session.data.createProfile.continuingOnOtherDevice = true
    req.uploadedFiles.length = 0
    res.redirect('/demos/create-profile/upload')
  })

  // Step 4 — Upload photo
  router.get('/demos/create-profile/upload', (req, res) => {
    res.render('demos/create-profile/upload.html')
  })

  router.post('/demos/create-profile/upload', getUploadedFiles(upload.fieldName), async (req, res) => {
    const { uploaded, rejected, aborted } = await upload.parse(req)
    if (aborted) return

    const realRejections = rejected.filter(r => r.error.code !== 'NO_FILE')
    if (realRejections.length > 0) {
      req.flash('error', uploadError(realRejections[0].error.message))
      return res.redirect('/demos/create-profile/upload')
    }

    if (uploaded.length === 0) {
      req.flash('error', uploadError('Select a photo'))
      return res.redirect('/demos/create-profile/upload')
    }

    req.uploadedFiles.length = 0
    req.uploadedFiles.push(uploaded[0])
    return res.redirect('/demos/create-profile/check-photo')
  })

  router.get('/demos/create-profile/file/:filename', (req, res) => {
    res.sendFile(path.join(process.cwd(), '.tmp/uploads', req.params.filename))
  })

  // Step 5 — Check photo
  router.get('/demos/create-profile/check-photo', getUploadedFiles(upload.fieldName), (req, res) => {
    res.render('demos/create-profile/check-photo.html', { uploadedFiles: req.uploadedFiles })
  })
  router.post('/demos/create-profile/check-photo', (req, res) => {
    const photoCorrect = (req.session.data.createProfile || {}).photoCorrect
    if (photoCorrect === 'no') {
      return res.redirect('/demos/create-profile/upload')
    }
    if ((req.session.data.createProfile || {}).continuingOnOtherDevice) {
      return res.redirect('/demos/create-profile/photo-uploaded')
    }
    res.redirect('/demos/create-profile/check')
  })

  // Step 5a — Photo uploaded on other device
  router.get('/demos/create-profile/photo-uploaded', (req, res) => {
    res.render('demos/create-profile/photo-uploaded.html')
  })

  // Step 6 — Check answers
  router.get('/demos/create-profile/check', getUploadedFiles(upload.fieldName), (req, res) => {
    res.render('demos/create-profile/check.html', { uploadedFiles: req.uploadedFiles })
  })
  router.post('/demos/create-profile/check', (req, res) => {
    req.session.data.createProfile = {}
    res.redirect('/demos/create-profile')
  })

}
