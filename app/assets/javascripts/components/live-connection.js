App.LiveConnection = function(options) {
  this.statusUrl = options.statusUrl
  this.role = options.role
  this.interval = options.interval || 2000
  this.states = options.states || {}
  this.image = options.image
  this.shown = 'default'
  this.firstPoll = true

  var dashIndex = document.title.indexOf(' - ')
  this.titleSuffix = dashIndex > -1 ? document.title.slice(dashIndex) : ''

  if (options.hidden) {
    options.hidden.hidden = true
  }

  this.poll()
}

App.LiveConnection.prototype.showState = function(name) {
  if (this.shown === name) return
  var el = this.states[name]
  if (!el) return

  Object.keys(this.states).forEach(function(key) {
    this.states[key].hidden = (key !== name)
  }, this)

  var heading = el.querySelector('h1')
  if (heading) {
    document.title = heading.textContent.trim() + this.titleSuffix
    if (!this.firstPoll) heading.focus()
  }

  this.shown = name
}

App.LiveConnection.prototype.handleStatus = function(data) {
  if (this.role === 'primary') {
    if (data.uploaded && this.shown !== 'uploaded') {
      if (this.image && data.photoFilename) {
        this.image.src = '/demos/create-profile-live/file/' + data.photoFilename
      }
      this.showState('uploaded')
    } else if (data.secondaryConnected && this.shown === 'default') {
      this.showState('connected')
    }
  } else if (this.role === 'secondary') {
    if (data.primaryConnected) {
      this.showState('ready')
    } else {
      this.showState('default')
    }
  }
  this.firstPoll = false
}

App.LiveConnection.prototype.poll = function() {
  $.get(this.statusUrl, { role: this.role })
    .done($.proxy(this, 'handleStatus'))
    .always($.proxy(this, 'scheduleNext'))
}

App.LiveConnection.prototype.scheduleNext = function() {
  this.timer = setTimeout($.proxy(this, 'poll'), this.interval)
}

App.LiveConnection.prototype.stop = function() {
  clearTimeout(this.timer)
}
