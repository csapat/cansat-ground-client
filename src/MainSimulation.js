import React from 'react'
import * as _THREE from 'three';
import _ThreeOrbitControls from 'three-orbit-controls'
import OBJLoader from 'three-obj-loader'
const THREE = _THREE
OBJLoader(THREE)
const OrbitControls = _ThreeOrbitControls(THREE)


class MainSimulation extends React.Component {
	constructor(props){
		super(props)
		this.scene = null
		this.camera = null
		this.renderer = null
		this.controls = null
		this.animate = this.animate.bind(this)
		this.addToScene = this.addToScene.bind(this)
	}

	componentDidMount(){
		let containerElement = document.getElementById("simulation-container")
		let domElement = document.getElementById("simulation")
		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(50, containerElement.clientWidth / containerElement.clientHeight, 1, 100000)
		this.renderer = new THREE.WebGLRenderer()
		this.renderer.setSize(containerElement.clientWidth-20, containerElement.clientHeight-62, false)
		domElement.appendChild(this.renderer.domElement)
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.camera.position.set(5000, 3000, 5000)

		const light = new THREE.AmbientLight(0xE5E5E5)
		this.scene.add(light)

		const gridSize = 12000
		const gridStep = 500
		const gridHelperHorizontal = new THREE.GridHelper(gridSize, gridSize/gridStep)
		this.scene.add(gridHelperHorizontal)

		let planeGeometry = new THREE.PlaneGeometry(1000, 1000)
		planeGeometry.rotateX(Math.PI/2)
		let planeMaterial = new THREE.MeshBasicMaterial({color: 0xf2b700, side: THREE.DoubleSide})
		let plane = new THREE.Mesh(planeGeometry, planeMaterial)

		let canGeometry = new THREE.CylinderGeometry(100, 100, 300, 100)
		let can = new THREE.Mesh(canGeometry, planeMaterial)
		
		let canEdgesGeometry = new THREE.EdgesGeometry(can.geometry, 30)
		let wireframeMaterial = new THREE.LineBasicMaterial({color: 0x000, linewidth: 5})
		let wireframe = new THREE.LineSegments(canEdgesGeometry, wireframeMaterial)
		can.add(wireframe)
		
		can.name = "can"

		let loader = new THREE.OBJLoader()
		loader.load('/wing_3d.OBJ', (obj)=>{
			obj.traverse((node)=>{
				if (node.isMesh){
					node.material = planeMaterial
					let meshEdgesGeometry = new THREE.EdgesGeometry(node.geometry, 15)
					let wireframe = new THREE.LineSegments(meshEdgesGeometry, wireframeMaterial)
					console.log(node)
					obj.add(wireframe)
				}
			})
			obj.rotateX(-Math.PI/2)
			obj.position.set(0, 800, -30)
			can.add(obj)
		})
		can.position.set(0, 100, 0)
		this.scene.add(can)
		this.camera.lookAt(can.position)
		this.controls.update()
		requestAnimationFrame(this.animate)
	}

	addToScene(object){
		this.scene.add(object)
	}
	
	animate(){
		
		let can = this.scene.getObjectByName("can")

		can.rotation.x = (this.props.currentData.roll||0)*Math.PI/180
		can.rotation.y = (this.props.currentData.course||0)*Math.PI/180
		can.rotation.z = (this.props.currentData.pitch||0)*Math.PI/180
		this.camera.lookAt(can.position)
		this.renderer.render(this.scene, this.camera)
		this.controls.update()
		requestAnimationFrame(this.animate)
	}

	render(){
		return <div id="simulation">

		</div>
	}
}

export default MainSimulation