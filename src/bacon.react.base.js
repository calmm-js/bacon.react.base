import Bacon from "baconjs"
import React from "react"

// Lifting

const nullState = {dispose: null, combined: null}

const common = {
  getInitialState() {
    return nullState
  },
  tryDispose() {
    const {dispose} = this.state
    if (dispose)
      dispose()
  },
  componentWillReceiveProps(nextProps) {
    this.trySubscribe(nextProps)
  },
  componentWillMount() {
    this.trySubscribe(this.props)
  },
  shouldComponentUpdate(nextProps, nextState) {
    return nextState.combined !== this.state.combined
  },
  componentWillUnmount() {
    this.tryDispose()
    this.setState(nullState)
  }
}

const toProperty = obs =>
  obs instanceof Bacon.EventStream ? obs.toProperty() : obs

const FromBacon = React.createClass({
  ...common,
  trySubscribe({bacon}) {
    this.tryDispose()

    this.setState({dispose: toProperty(bacon).onValue(
      combined => this.setState({combined})
    )})
  },
  render() {
    return this.state.combined
  }
})

export const fromBacon = bacon =>
  React.createElement(FromBacon, {bacon})

const FromClass = React.createClass({
  ...common,
  trySubscribe({props}) {
    this.tryDispose()

    const vals = {}
    const obsKeys = []
    const obsStreams = []

    for (const key in props) {
      const val = props[key]
      const keyOut = "mount" === key ? "ref" : key
      if (val instanceof Bacon.Observable) {
        obsKeys.push(keyOut)
        obsStreams.push(val)
      } else if ("children" === key &&
                 val instanceof Array &&
                 val.find(c => c instanceof Bacon.Observable)) {
        obsKeys.push(keyOut)
        obsStreams.push(Bacon.combineAsArray(val))
      } else {
        vals[keyOut] = val
      }
    }

    this.setState({dispose: Bacon.combineAsArray(obsStreams).onValue(obsVals => {
      const props = {}
      let children = null
      for (const key in vals) {
        const val = vals[key]
        if ("children" === key) {children = val} else {props[key] = val}
      }
      for (let i=0, n=obsKeys.length; i<n; ++i) {
        const key = obsKeys[i]
        const val = obsVals[i]
        if ("children" === key) {children = val} else {props[key] = val}
      }
      this.setState({combined: {props, children}})
    })})
  },
  render() {
    const {combined} = this.state
    return combined && React.createElement(this.props.Class,
                                           combined.props,
                                           combined.children)
  }
})

export const fromClass =
  Class => props => React.createElement(FromClass, {Class, props})

export const fromClasses = classes => {
  const result = {}
  for (const k in classes)
    result[k] = fromClass(classes[k])
  return result
}

function B() {
  const n = arguments.length
  if (1 === n) {
    const fn = arguments[0]
    return (...xs) => B(fn, ...xs)
  } else {
    for (let i=0; i<n; ++i) {
      const x = arguments[i]
      const c = x && x.constructor
      if (c === Object || c === Array)
        arguments[i] = Bacon.combineTemplate(x)
    }
    return Bacon.combineWith.apply(Bacon, arguments)
  }
}

export default B
