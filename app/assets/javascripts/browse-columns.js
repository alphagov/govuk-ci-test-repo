//= require govuk_publishing_components/vendor/polyfills/closest
window.GOVUK = window.GOVUK || {}
window.GOVUK.Modules = window.GOVUK.Modules || {};

(function (Modules) {
  function BrowseColumns ($module) {
    this.$module = $module
  }

  BrowseColumns.prototype.init = function () {
    if (!GOVUK.support.history()) return
    if (this.isMobile()) {
      this.$mobile = true
      this.$module.addEventListener('click', this.navigate.bind(this))
      return // don't do JS on mobile, apart from tracking events
    }

    this.$root = this.$module.querySelector('#root')
    this.$section = this.$module.querySelector('#section')
    this.$subsection = this.$module.querySelector('#subsection')
    this.$breadcrumbs = document.querySelector('.gem-c-breadcrumbs')

    this.displayState = this.$module.getAttribute('data-state')
    if (!this.displayState) {
      this.displayState = 'root'
      this.rightMostColumn = this.$root
    } else {
      if (this.displayState === 'section') {
        this.rightMostColumn = this.$section
      } else if (this.displayState === 'subsection') {
        this.rightMostColumn = this.$subsection
      }
    }
    this.$module.dimension26 = this.countLinkSections()
    this.$module.dimension27 = this.countTotalLinks()

    this._cache = {}
    this.lastState = this.parsePathname(window.location.pathname)

    this.$module.addEventListener('click', this.navigate.bind(this))
    window.addEventListener('popstate', this.popState.bind(this))
  }

  BrowseColumns.prototype.isMobile = function () {
    return window.screen.width < 640
  }

  BrowseColumns.prototype.navigate = function (event) {
    var target = event.target
    var clicked = target.tagName === 'A' ? target : target.closest('a')

    if (!clicked) {
      return
    }

    this.fireClickEvent(clicked)

    if (!this.$mobile) {
      if (clicked.pathname.match(/^\/browse\/[^/]+(\/[^/]+)?$/)) {
        event.preventDefault()
        var state = this.parsePathname(clicked.pathname)
        state.title = clicked.textContent

        if (state.path === window.location.pathname) {
          return
        }

        this.addLoading(clicked)
        this.getSectionData(state)
      }
    }
  }

  BrowseColumns.prototype.fireClickEvent = function (link) {
    var category = link.getAttribute('data-track-category')
    var action = link.getAttribute('data-track-action')
    var options = JSON.parse(link.getAttribute('data-track-options'))

    if (!this.$mobile) {
      if (this.displayState === 'root') {
        options.dimension32 = 'Browse Index'
        this.rightMostColumn = this.$root
      } else if (this.displayState === 'section') {
        options.dimension32 = 'First Level Browse'
        this.rightMostColumn = this.$section
      } else if (this.displayState === 'subsection') {
        this.rightMostColumn = this.$subsection
        options.dimension32 = 'Second Level Browse'
      }
      this.$module.dimension26 = this.countLinkSections()
      this.$module.dimension27 = this.countTotalLinks()
      options.dimension26 = this.$module.dimension26
      options.dimension27 = this.$module.dimension27
    }
    options.label = link.getAttribute('data-track-label')
    options.location = document.location.href
    options.title = document.title.replace('Browse:', '').trim()

    if (window.GOVUK.analytics && window.GOVUK.analytics.trackEvent) {
      GOVUK.analytics.trackEvent(category, action, options)
    }
  }

  // count the number of lists of links in the right-most visible column
  BrowseColumns.prototype.countLinkSections = function () {
    return this.rightMostColumn.querySelectorAll('.browse__list').length
  }

  // count the total number of links in the right most visible column
  BrowseColumns.prototype.countTotalLinks = function () {
    return this.rightMostColumn.querySelectorAll('a').length
  }

  BrowseColumns.prototype.getSectionData = function (state, poppingState) {
    var cacheForSlug = this.sectionCache(state.slug)

    if (typeof state.sectionData !== 'undefined') {
      this.handleResponse(state.sectionData, state, poppingState)
    } else if (typeof cacheForSlug !== 'undefined') {
      this.handleResponse(cacheForSlug, state, poppingState)
    } else {
      var done = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
          var data = JSON.parse(e.target.response)
          this.sectionCache(state.slug, data)
          this.handleResponse(data, state)
        }
      }
      var xhr = new XMLHttpRequest()
      var url = '/browse/' + state.slug + '.json'
      xhr.open('GET', url, true)
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
      xhr.addEventListener('load', done.bind(this))

      xhr.send()
    }
  }

  // if passed data, sets the cache to that data
  // otherwise returns the matching cache
  BrowseColumns.prototype.sectionCache = function (slug, data) {
    if (typeof data === 'undefined') {
      return this._cache['section' + slug]
    } else {
      this._cache['section' + slug] = data
    }
  }

  BrowseColumns.prototype.handleResponse = function (data, state, poppingState) {
    state.sectionData = data
    this.lastState = state
    if (state.subsection) {
      this.displayState = 'subsection'
      this.showSubsection(state)
    } else {
      this.displayState = 'section'
      this.showSection(state)
    }

    if (typeof poppingState === 'undefined') {
      history.pushState(state, '', state.path)
      this.trackPageview(state)
    }
    this.removeLoading()
  }

  BrowseColumns.prototype.popState = function (e) {
    var state = e.state
    if (!state) { // state will be null if there was no state set
      state = this.parsePathname(window.location.pathname)
    }

    if (state.slug === '') {
      this.showRoot()
    } else if (state.subsection) {
      this.restoreSubsection(state)
    } else {
      this.loadSectionFromState(state, true)
    }
    this.trackPageview(state)
  }

  BrowseColumns.prototype.restoreSubsection = function (state) {
    // are we displaying the correct section for the subsection?
    if (this.lastState.section !== state.section) {
      // load the section then load the subsection after
      var sectionPathname = window.location.pathname.split('/').slice(0, -1).join('/')
      var sectionState = this.parsePathname(sectionPathname)
      this.getSectionData(sectionState, true)
      this.loadSectionFromState(sectionState, true)
    }
    this.loadSectionFromState(state, true)
  }

  BrowseColumns.prototype.loadSectionFromState = function (state, poppingState) {
    if (state.subsection) {
      this.showSubsection(state)
    } else {
      this.showSection(state)
    }

    if (typeof poppingState === 'undefined') {
      history.pushState(state, '', state.path)
      this.trackPageview(state)
    }
  }

  BrowseColumns.prototype.showRoot = function () {
    this.$section.innerHTML = ''
    this.displayState = 'root'
  }

  BrowseColumns.prototype.showSection = function (state) {
    this.setContentIdMetaTag(state.sectionData.content_id)
    this.setNavigationPageTypeMetaTag(state.sectionData.navigation_page_type)
    state.title = this.getTitle(state.slug)
    this.setTitle(state.title)
    this.$section.innerHTML = state.sectionData.html

    this.highlightSection('root', state.path)
    this.updateBreadcrumbs(state)

    this.changeColumnVisibility(1)
    this.$section.querySelector('.js-heading').focus()
    this.rightMostColumn = this.$section
  }

  BrowseColumns.prototype.changeColumnVisibility = function (columns) {
    if (columns === 3) {
      this.$module.classList.remove('browse--two-columns')
      this.$module.classList.add('browse--three-columns')
    } else if (columns === 2) {
      this.$module.classList.add('browse--two-columns')
      this.$module.classList.remove('browse--three-columns')
    } else {
      this.$module.classList.remove('browse--two-columns')
      this.$module.classList.remove('browse--three-columns')
    }
  }

  BrowseColumns.prototype.showSubsection = function (state) {
    this.setContentIdMetaTag(state.sectionData.content_id)
    this.setNavigationPageTypeMetaTag(state.sectionData.navigation_page_type)
    state.title = this.getTitle(state.slug)
    this.setTitle(state.title)
    this.$subsection.innerHTML = state.sectionData.html
    this.highlightSection('section', state.path)
    this.highlightSection('root', '/browse/' + state.section)
    this.updateBreadcrumbs(state)

    this.changeColumnVisibility(3)
    this.$subsection.querySelector('.js-heading').focus()
    this.rightMostColumn = this.$subsection
  }

  BrowseColumns.prototype.getTitle = function (slug) {
    var $link = this.$module.querySelector('a[href$="/browse/' + slug + '"]')
    var $heading = $link.querySelector('h3')
    if ($heading) {
      return $heading.textContent
    } else {
      return $link.textContent
    }
  }

  BrowseColumns.prototype.setTitle = function (title) {
    document.title = title + ' - GOV.UK'
  }

  BrowseColumns.prototype.setContentIdMetaTag = function (contentId) {
    var contentTag = document.querySelector('meta[name="govuk:content-id"]')
    if (contentTag) {
      contentTag.setAttribute('content', contentId)
    }
  }

  BrowseColumns.prototype.setNavigationPageTypeMetaTag = function (navigationPageType) {
    var meta = document.querySelector('meta[name="govuk:navigation-page-type"]')
    if (meta) {
      meta.setAttribute('content', navigationPageType)
    }
  }

  BrowseColumns.prototype.addLoading = function (el) {
    this.$module.setAttribute('aria-busy', 'true')
    el.classList.add('loading')
  }

  BrowseColumns.prototype.removeLoading = function () {
    this.$module.setAttribute('aria-busy', 'false')
    var loading = this.$module.querySelector('a.loading')
    if (loading) {
      loading.classList.remove('loading')
    }
  }

  BrowseColumns.prototype.highlightSection = function (section, slug) {
    var $section = this.$module.querySelector('#' + section)
    var selected = $section.querySelector('.browse__link--active')
    if (selected) {
      selected.classList.remove('browse__link--active')
      selected.classList.add('browse__link--inactive')
    }
    var link = this.$module.querySelector('a[href$="' + slug + '"]')
    link.classList.add('browse__link--active')
    link.classList.remove('browse__link--inactive')
  }

  BrowseColumns.prototype.parsePathname = function (pathname) {
    var out = {
      path: pathname,
      slug: pathname.replace(/\/browse\/?/, '')
    }

    if (out.slug.indexOf('/') > -1) {
      out.section = out.slug.split('/')[0]
      out.subsection = out.slug.split('/')[1]
    } else {
      out.section = out.slug
    }
    return out
  }

  BrowseColumns.prototype.updateBreadcrumbs = function (state) {
    var tempDiv = document.createElement('div')
    tempDiv.innerHTML = state.sectionData.breadcrumbs
    var markup = tempDiv.querySelector('ol')
    this.$breadcrumbs.innerHTML = markup.outerHTML
  }

  BrowseColumns.prototype.trackPageview = function (state) {
    var sectionTitle = this.$section.querySelector('h2')
    sectionTitle = sectionTitle ? sectionTitle.textContent.toLowerCase().replace('browse:', '').trim() : 'browse'
    var navigationPageType = 'none'

    if (this.displayState === 'section') {
      navigationPageType = 'First Level Browse'
    } else if (this.displayState === 'subsection') {
      navigationPageType = 'Second Level Browse'
    }

    this.firePageview(state, sectionTitle, navigationPageType)
    this.firePageview(state, sectionTitle, navigationPageType, 'govuk')
  }

  BrowseColumns.prototype.firePageview = function (state, sectionTitle, navigationPageType, tracker) {
    if (GOVUK.analytics && GOVUK.analytics.trackPageview) {
      var options = {
        dimension1: sectionTitle,
        dimension26: this.countLinkSections(),
        dimension27: this.countTotalLinks(),
        dimension32: navigationPageType,
        location: window.location.href
      }

      if (typeof tracker !== 'undefined') {
        options.trackerName = tracker
      }

      GOVUK.analytics.trackPageview(
        state.path,
        document.title,
        options
      )
    }
  }

  Modules.BrowseColumns = BrowseColumns
})(window.GOVUK.Modules)
