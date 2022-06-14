import React from 'react'
import './App.css'
import Clock from 'react-live-clock'
import NewWindow from 'react-new-window'
import io from 'socket.io-client'
import L from 'leaflet'
import { ResponsiveContainer, LineChart, Line, YAxis, CartesianGrid, XAxis } from 'recharts'

import MainSimulation from './MainSimulation'

import data from './data.json'

const socket = io('http://localhost:8000/')

//const position = [47.492266, 19.031861]


const chartHeight = 97

class App extends React.Component{
	constructor(props){
		super(props)
		this.map = null
		this.marker = null
		this.mapZoomStart = 0
		this.state = {
			portStatus: {status: null},
			currentData: {
				bme_temp: 0,
				bme_pressure: 0,
				bme_altitude: 0,
				bme_humidity: 0,
				gps_latitude: 0,
				gps_longtitude: 0,
				gps_altitude: 0,
				time: new Date()
			},
			data: [],
			status: null
		}
	}
	componentDidMount1(){
		this.map = L.map('mapid').setView([0,0], 0)

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(this.map)

		socket.on('data', (data)=>{
			let dataObj = JSON.parse(data)
			
			let dataState = [...this.state.data, dataObj]
			if (dataState.length>50) dataState.shift()
			this.setState({currentData: dataObj, data: dataState})
			let position = [dataObj.gps_latitude, dataObj.gps_longtitude]
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
			
			{Object.keys(data[0]).map(key=>{
					if (typeof data[0][key] == 'object'){
						return (
							<>
							<h1>{key}:</h1>
							{Object.keys(data[0][key]).map(key2=>{
								return (<>
								<h2>{key}:{key2}</h2>
								<ResponsiveContainer height={400} className="chart">
									<LineChart data={data}>
										<Line isAnimationActive={false} dot={false}  type="linear" stroke="#FFEB3B" dataKey={key + "." + key2}/>
										<YAxis interval={"preserveStartEnd"} axisLine={false}/>
										
										<XAxis minTickGap={50} dataKey="time" tickFormatter={(val)=>new Date(val).toLocaleTimeString()}/>
									</LineChart>
								</ResponsiveContainer>
								</>)
							})}
							</>
						)
					} else {
						return (
							<>
							<h1>{key}</h1>
							<ResponsiveContainer height={400} className="chart">
								<LineChart data={data}>
									<Line isAnimationActive={false} dot={false}  type="linear" stroke="#FFEB3B" dataKey={key}/>
									<YAxis interval={"preserveStartEnd"} axisLine={false}/>
									<XAxis minTickGap={50} dataKey="time" tickFormatter={(val)=>new Date(val).toLocaleTimeString()}/>
								</LineChart>
							</ResponsiveContainer>
							</>
						)
					}
			})}
					
			</div>
		)
	}
	render0(){
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
					<div className="grid">
						<div className="data-half-1">
							<div className="value-grid underlined">
								{Object.keys(this.state.currentData).slice(0,7).map(key=>{
									let value = this.state.currentData[key]
									return <>
										<div>{key}:</div>
										<div>{value && typeof value==='object' ? 
												Object.keys(value).map(subKey=><>{subKey}: {value[subKey]}<br/></>)
											: value}
										</div>
									</>
								})}
							</div>
						</div>
						<div className="data-half-2">
							<div className="value-grid underlined">
								{Object.keys(this.state.currentData).slice(7).map(key=>{
									let value = this.state.currentData[key]
									return <>
										<div>{key}:</div>
										<div>{value && typeof value==='object' ? 
												Object.keys(value).map(subKey=><>{subKey}: {value[subKey]}<br/></>)
											: value}
										</div>
									</>
								})}
							</div>
						</div>
					</div>
					
					
				</div>

				<div className="window map-window">
					<div>GPS: {this.state.currentData.lat} {this.state.currentData.lon}</div>
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
					
					<br />
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label bold">Signal strength: {String(this.state.currentData.signal_strength)}</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: 100-(this.state.currentData.signal_strength*-1) + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={chartHeight} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="signal_strength" stroke="#FFEB3B" />
							<YAxis allowDecimals={false} minTickGap={1} interval={"preserveStartEnd"} axisLine={false} mirror domain={[Math.floor(Math.min.apply({}, this.state.data.map(u=>Math.min(u.signal_strength)))), Math.ceil(Math.max.apply({}, this.state.data.map(u=>Math.max(u.signal_strength))))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>					
				</div>
				<div className="window sensor-window">
					<div><b>Sensors</b></div>
					<hr />
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Altitude (bme): {String(this.state.currentData.bme_altitude.toFixed(2)).padStart(4, '0')}m</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.bme_altitude/1500)*100 + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={chartHeight} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="bme_altitude" stroke="#FFEB3B" />
							<YAxis allowDecimals={false} minTickGap={1} interval={"preserveStartEnd"} axisLine={false} mirror domain={[Math.floor(Math.min.apply({}, this.state.data.map(u=>Math.min(u.bme_altitude)))), Math.ceil(Math.max.apply({}, this.state.data.map(u=>Math.max(u.bme_altitude))))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Temp (bme): {Number(this.state.currentData.bme_temperature).toFixed(2).padStart(3, '0')}°C</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.bme_temperature/100)*100 + '%'}}></div></div>
						<div className="value-label">Temp (mpu): {Number(this.state.currentData.mpu_temperature).toFixed(2).padStart(3, '0')}°C</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#2196f3', width: (this.state.currentData.mpu_temperature/100)*100 + '%'}}></div></div>
					</div>
					<ResponsiveContainer height={chartHeight} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="bme_temperature" stroke="#FFEB3B" />
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="mpu_temperature" stroke="#2196f3" />
							<YAxis allowDecimals={false} minTickGap={1} interval={"preserveStartEnd"} axisLine={false} mirror domain={[Math.floor(Math.min.apply({}, this.state.data.map(u=>Math.min(u.bme_temperature, u.mpu_temperature)))), Math.ceil(Math.max.apply({}, this.state.data.map(u=>Math.max(u.bme_temperature, u.mpu_temperature))))]}/>
						</LineChart>
					</ResponsiveContainer>
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Pressure: {String(this.state.currentData.bme_pressure.toFixed(0)).padStart(6, '0')} Pa</div>
						{/* <div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.bme_pressure/10E5)*100 + '%'}}></div></div> */}
					</div>
					<div>
					<ResponsiveContainer height={chartHeight} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="bme_pressure" stroke="#FFEB3B" />
							<YAxis allowDecimals={false} minTickGap={1} interval={"preserveStartEnd"} axisLine={false} mirror domain={[Math.floor(Math.min.apply({}, this.state.data.map(u=>Math.min(u.bme_pressure)))), Math.ceil(Math.max.apply({}, this.state.data.map(u=>Math.max(u.bme_pressure))))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
					
					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Humidity: {String(this.state.currentData.bme_humidity.toFixed(2)).padStart(4, '0')}%</div>
						<div className="value-bar-container"><div className="value-bar" style={{backgroundColor: '#FFEB3B', width: (this.state.currentData.bme_humidity/100)*100 + '%'}}></div></div>
					</div>
					<div>
					<ResponsiveContainer height={chartHeight} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="bme_humidity" stroke="#FFEB3B" />
							<YAxis allowDecimals={false} minTickGap={1} interval={"preserveStartEnd"} axisLine={false} mirror domain={[Math.floor(Math.min.apply({}, this.state.data.map(u=>Math.min(u.bme_humidity)))), Math.ceil(Math.max.apply({}, this.state.data.map(u=>Math.max(u.bme_humidity))))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>

					<div>&nbsp;</div>
					<div className="value-grid">
						<div className="value-label">Gas sensor value: {this.state.currentData.gas_value}</div>
					</div>
					<div>
					<ResponsiveContainer height={chartHeight} className="chart">
						<LineChart data={this.state.data}>
							<Line isAnimationActive={false} dot={false} type="linear" dataKey="gas_value" stroke="#FFEB3B" />
							<YAxis allowDecimals={false} minTickGap={1} interval={"preserveStartEnd"} axisLine={false} mirror domain={[Math.floor(Math.min.apply({}, this.state.data.map(u=>Math.min(u.gas_value)))), Math.ceil(Math.max.apply({}, this.state.data.map(u=>Math.max(u.gas_value))))]}/>
						</LineChart>
					</ResponsiveContainer>
					</div>
				</div>
			</div>
		)
	}
}

export default App
