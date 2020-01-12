import React from 'react'
import './App.css'
import Clock from 'react-live-clock'
import NewWindow from 'react-new-window'
import io from 'socket.io-client'
import L from 'leaflet'
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'

const socket = io('http://localhost:8000/')

//const position = [47.492266, 19.031861]

class App extends React.Component{
	constructor(props){
		super(props)
		this.map = null
		this.marker = null
		this.mapZoomStart = 0
		this.state = {
			portStatus: {status: null},
			currentData: {},
			data: [],
			status: null
		}
	}
	componentDidMount(){
		this.map = L.map('mapid').setView([0,0], 0)

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(this.map)

		socket.on('data', (data)=>{
			document.getElementById('rawdata').prepend(document.createElement('br'))
			document.getElementById('rawdata').prepend(data)
			let sd = data.split(" ")
			
			let dataObj = {
				lat: sd[0],
				lon: sd[1],
				uv1: sd[2],
				uv2: sd[3],
				uv3: sd[4]
			}
			let dataState = [...this.state.data, dataObj]
			if (dataState.length>50) dataState.shift()
			this.setState({currentData: dataObj, data: dataState})
			let position = [sd[0],sd[1]]

			if (this.map.getZoom()===0) {
				this.mapZoomStart = new Date()
				this.map.flyTo(position, 15, {duration: 5})
				this.marker = L.marker(position).addTo(this.map)
			} else if ((new Date())-this.mapZoomStart>6000) {
				this.map.panTo(position)
				this.marker.setLatLng(position)
			}
		})

		socket.on('portStatus', (portStatus)=>{
			this.setState({portStatus})
		})

		socket.on('disconnect', ()=>{
			this.setState({status: 'disconnected'})
		})
		socket.on('connect', ()=>{
			this.setState({status: 'ok'})
		})
		socket.on('reconnect', ()=>{
			this.setState({status: 'ok'})
		})
	}
	render(){
		return (
			<div className="app">
				<div className="header">
					<b><div>ESA CanSat 2020</div>
					<div>CSapat</div>
					<div><Clock format={'YYYY.MM.DD HH:mm:ss'} ticking/></div>
					</b>
				</div>
				<div className="window live-data-window">
					<div><b>Data</b></div>
					<hr />
					<div className="live-data" id="rawdata">
					</div>
				</div>

				<div className="window map-window">
					<div><b>Map</b></div>
					<hr />
					<div id="mapid"></div>
				</div>
				<div className="window main-window">
					<div><b>...</b></div>
					<hr />
				</div>
				<div className="window status-window">
					<div><b>Status</b></div>
					<hr />
					{
						(this.state.status==="ok"&&this.state.portStatus.status==="open") ? 
						<div className="good bold">All services operational</div> :
						(()=>{
							switch (this.state.status){
								case 'disconnected':
									return <div className="bad bold">Disconnected from server</div>
									break
								default:
									return <div className="warn bold">Disruptions</div>
									break
							}
						})()
					}
					<div><Clock format={'HH:mm:ss'} ticking/></div>
					<div>&nbsp;</div>
					Serial:
					{(this.state.portStatus.status==='open') ? <span className="good bold"> Open </span> : null}
					{(this.state.portStatus.status==='closed') ? <span className="bad bold"> Closed </span> : null}
					{(this.state.portStatus.status==='manual-closed') ? <span className="warn bold"> Man.Closed </span> : null}
					{this.state.portStatus.status ? <span>{this.state.portStatus.selectedPort} @ {this.state.portStatus.baudRate}</span> : <span className="warn"> Fetching...</span>}
					{this.state.portStatus.status==='open' ? 
						<button onClick={()=>{
							socket.emit('port-close')
						}}>Close</button>
						:
						<button onClick={()=>{
							socket.emit('port-open')
						}}>Open</button>
					}
					
				</div>
				<div className="window sensor-window">
					<div><b>Sensors</b></div>
					<hr />
					<div>GPS: {this.state.currentData.lat} {this.state.currentData.lon}</div>
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">UV1: {String(this.state.currentData.uv1).padStart(4, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.uv1/1023)*100 + '%'}}></div></div>
						<div className="value-label">UV2: {String(this.state.currentData.uv2).padStart(4, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#2196f3', width: (this.state.currentData.uv2/1023)*100 + '%'}}></div></div>
						<div className="value-label">UV3: {String(this.state.currentData.uv3).padStart(4, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#4caf50', width: (this.state.currentData.uv3/1023)*100 + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={150} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="uv1" stroke="#FFEB3B" />
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="uv2" stroke="#2196f3" />
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="uv3" stroke="#4caf50" />
							<YAxis tick={false} tickLine={false} width={0} domain={[0,1023]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
				</div>
			</div>
		)
	}
}

export default App
