import React from 'react'
import './App.css'
import Clock from 'react-live-clock'
import NewWindow from 'react-new-window'
import io from 'socket.io-client'
import L from 'leaflet'
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'

import MainSimulation from './MainSimulation'

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
			currentData: {
				course: 0,
				lat: 0,
				lon: 0,
				alt: 0,
				temp1: 0,
				temp2: 0,
				temp3: 0,
				acc: {x: 0, y: 0, z: 0},
				mag: {x: 0, y: 0, z: 0},
				gyro: {x: 0, y: 0, z: 0},
				roll: 0,
				pitch: 0,
				yaw: 0,
				pressure: 0,
				humidity: 0,
				uv: 0,
				loop: 0,
				time: 0
			},
			data: [],
			status: null
		}
	}
	componentDidMount(){
		this.map = L.map('mapid').setView([0,0], 0)

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(this.map)

		socket.on('data', (data)=>{
			let dataObj = JSON.parse(data)
			
			let dataState = [...this.state.data, dataObj]
			if (dataState.length>50) dataState.shift()
			this.setState({currentData: dataObj, data: dataState})
			let position = [dataObj.lat, dataObj.lon]

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
		let radioReceiveFrequency = this.state.currentData&&this.state.data[this.state.data.length-2] ? Number(1000/(this.state.currentData.time-this.state.data[this.state.data.length-2].time)).toFixed(3).padEnd(5, 0) : 0
		let noWarns = true
		let noData = false
		if (radioReceiveFrequency<0.9) noWarns = false
		if(new Date().getTime() - this.state.currentData.time > 3000) {
			noWarns = false
			noData = true
		}
		return (
			<div className="app">
				<div className="window header">
					<b><div>ESA CanSat 2020</div>
					<div>CSapat</div>
					<div><Clock format={'YYYY.MM.DD HH:mm:ss'} ticking/></div>
					</b>
				</div>
				<div className="window live-data-window">
					<div><b>Data</b></div>
					<hr />
					{}
					<div className="value-grid underlined">
						{["temp1","temp2","temp3","pressure","humidity","uv","acc","mag","gyro"].map(key=>{
							let value = this.state.currentData[key]
							return <>
								<div>{key}:</div>
								<div>{typeof value==='object' ? 
										Object.keys(value).map(subKey=><>{subKey}: {value[subKey]}<br/></>)
									: value}
								</div>
							</>
						})}
						
					</div>
					
				</div>

				<div className="window map-window">
					<div>GPS: {this.state.currentData.lat.toFixed(9)} {this.state.currentData.lon.toFixed(9)}</div>
					<hr />
					<div id="mapid"></div>
				</div>
				<div id="simulation-container" className="window main-window">
					<div><b>Simulation</b></div>
					<hr />
					<MainSimulation currentData={this.state.currentData} />
				</div>
				<div className="window status-window">
					<div><b>Status</b></div>
					<hr />
					{
						(this.state.status==="ok"&&this.state.portStatus.status==="open"&&noWarns) ? 
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
					<div className="bad bold">
						{radioReceiveFrequency<0.9&&!noData ? "Low datarate!" : null}
						{noData&&this.state.portStatus.status==="open" ? `Not receiving data! (${(new Date().getTime() - this.state.currentData.time)/1000} s)` : null}
						&nbsp;
					</div>
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
					<br />
					<br />
					<div>Data freq.: <span className={(radioReceiveFrequency<0.9 ? 'bold bad' : (radioReceiveFrequency>1.1) ? 'good' : 'warn')}>{radioReceiveFrequency} Hz</span></div>
					<div>Loop freq.: {Math.round(this.state.currentData.loop*1000)/1000} Hz</div>
					
				</div>
				<div className="window sensor-window">
					<div><b>Sensors</b></div>
					<hr />
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Altitude: {String(this.state.currentData.alt.toFixed(1)).padStart(4, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.alt/1500)*100 + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={150} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="alt" stroke="#FFEB3B" />
							<YAxis tick={false} tickLine={false} width={0} domain={[Math.min.apply({}, this.state.data.map(u=>u.alt)), Math.max.apply({}, this.state.data.map(u=>u.alt))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Temp1: {Number(this.state.currentData.temp1).toFixed(4).padStart(3, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.temp1/100)*100 + 50 + '%'}}></div></div>
						<div className="value-label">Temp2: {Number(this.state.currentData.temp2).toFixed(4).padStart(3, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#2196f3', width: (this.state.currentData.temp2/100)*100 + 50 + '%'}}></div></div>
						<div className="value-label">Temp3: {Number(this.state.currentData.temp3).toFixed(4).padStart(3, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#4caf50', width: (this.state.currentData.temp3/100)*100 + 50 + '%'}}></div></div>
					</div>
					<ResponsiveContainer height={150} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="temp1" stroke="#FFEB3B" />
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="temp2" stroke="#2196f3" />
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="temp3" stroke="#4caf50" />
							<YAxis tick={false} tickLine={false} width={0} domain={[Math.min.apply({}, this.state.data.map(u=>Math.min(u.temp1, u.temp2, u.temp3))), Math.max.apply({}, this.state.data.map(u=>Math.max(u.temp1, u.temp2, u.temp3)))]}/>
						</LineChart>
					</ResponsiveContainer>
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">UV: {String(this.state.currentData.uv.toFixed(4)).padStart(4, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.uv/50)*100 + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={150} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="uv" stroke="#FFEB3B" />
							<YAxis tick={false} tickLine={false} width={0} domain={[Math.min.apply({}, this.state.data.map(u=>u.uv)), Math.max.apply({}, this.state.data.map(u=>u.uv))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Pressure: {String(this.state.currentData.pressure.toFixed(4)).padStart(4, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.pressure/10E5)*100 + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={150} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="pressure" stroke="#FFEB3B" />
							<YAxis tick={false} tickLine={false} width={0} domain={[Math.min.apply({}, this.state.data.map(u=>u.pressure)), Math.max.apply({}, this.state.data.map(u=>u.pressure))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Humidity: {String(this.state.currentData.humidity.toFixed(4)).padStart(4, '0')}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.humidity)*100 + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={150} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="humidity" stroke="#FFEB3B" />
							<YAxis tick={false} tickLine={false} width={0} domain={[Math.min.apply({}, this.state.data.map(u=>u.humidity)), Math.max.apply({}, this.state.data.map(u=>u.humidity))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
				</div>
			</div>
		)
	}
}

export default App
