import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { GraphView } from "react-digraph";

const nodeTypes = {
  text: {
    typeText: "Text",
    shapeId: "#text",
    shape: (
      <symbol viewBox="0 0 100 100" id="text" key="0">
        <circle cx="50" cy="50" r="45" />
      </symbol>
    )
  },
  start: {
    typeText: "START",
    title: "",
    shapeId: "#start",
    shape: (
      <symbol viewBox="0 0 50 50" id="start">
        <rect
          transform="rotate(45)"
          x="27.5"
          y="-7.5"
          width="15"
          height="15"
          fill="currentColor"
        />
      </symbol>
    )
  },
  end: {
    typeText: "END",
    shapeId: "#end",
    shape: (
      <symbol viewBox="0 0 50 50" id="end">
        <rect
          transform="rotate(45)"
          x="27.5"
          y="-7.5"
          width="15"
          height="15"
          fill="currentColor"
        />
      </symbol>
    )
  }
};

const nodeSubtypes = {};

const edgeTypes = {
  option: {
    shapeId: "#option",
    shape: <span />
  },
  route: {
    shapeId: "#option",
    shape: <span />
  }
};

export function Editor() {
  const params = useParams()
  const [ story, setStory ] = useState(null)
  const [ nodes, setNodes ] = useState([])
  const [ edges, setEdges ] = useState([])
  const [ selected, setSelected ] = useState({})
  const [ selectedNode, setSelectedNode ] = useState(null)
  const [ selectedEdge, setSelectedEdge ] = useState(null)
  const [ nodeType, setNodeType ] = useState('text')

  const createNode = (type, x, y) => {
    let base = { id: uuid(), type, x, y }

    switch(type) {
      case 'start':
      case 'end':
        return base

      case 'text':
      default:
        return {
          ...base,
          title: 'Untitled',
          text: ''
        }
    }
  }

  const matchEdgeType = (source, target) => {
    switch(source.type) {
      case 'text':
        return 'option'
      case 'start':
      case 'end':
      default:
        return 'route'
    }
  }

  const createEdge = (type, source, target) => {
    let base = {
      source: source.id,
      target: target.id,
      type
    }

    switch(type) {
      case 'option':
        return {
          ...base,
          handleText: ''
        }
      case 'route':
      default:
        return base
    }
  }

  const updateEdges = (source, target, newEdge) => {
    let newEdges = edges

    if (source.type === 'start') {
      // replace edges with same start node
      newEdges = newEdges.filter((edge) => edge.source !== newEdge.source)
    }
    if (target.type === 'end') {
      // replace edges with same end node
      newEdges = newEdges.filter((edge) => edge.target !== newEdge.target)
    }

    setEdges([...newEdges, newEdge]) // update and push new edge
  }

  const canCreateEdge = (type, source, target) => {
    if (source.id === target.id) return false // nodes cannot be connected to themselves
    if (target.type === 'start') return false // nodes cannot be directed towards a start node
    if (source.type === 'end') return false // nodes cannot come from an end node
    return true
  }

  const onCreateNode = (x, y) => {
    let node = createNode(nodeType, x, y)
    console.log("create node", node)
    setNodes([...nodes, node])
  };

  const onCreateEdge = (source, target) => {
    let type = matchEdgeType(source, target)

    if (canCreateEdge(type, source, target)) {
      let edge = createEdge(type, source, target)
      console.log("create edge", edge)
      updateEdges(source, target, edge)
    }
  };

  const onSelect = (selected) => {
    console.log('select', selected)

    const nodeCount = selected.nodes?.size || 0
    const edgeCount = selected.edges?.size || 0

    let selectedNode = null
    let selectedEdge = null

    if (nodeCount === 1 && edgeCount === 0) {
      selectedNode = selected.nodes.values().next().value
    } else if (nodeCount === 0 && edgeCount === 1) {
      selectedEdge = selected.edges.values().next().value
    }

    setSelected(selected)
    setSelectedNode(selectedNode)
    setSelectedEdge(selectedEdge)
  }
  
  const canDeleteSelected = (selected) => true

  const onDeleteSelected = (selected) => {
    console.log('delete', selected)
    onDeleteNodes(selected.nodes)
    onDeleteEdges(selected.edges)
  }

  const onDeleteNodes = (lookup) => {
    if (lookup) {
      setNodes(nodes.filter(node => !lookup.has(node.id)))
    }
  }

  const onDeleteEdges = (lookup) => {
    if (lookup) {
      setEdges(edges.filter(edge => !lookup.has(`${edge.source}_${edge.target}`)))
    }
  }

  const onUpdateNode = (newNode) => {
    console.log("update node", newNode);

    setNodes(nodes.map((node) => {
      if (node.id === newNode.id) {
        return newNode
      } else {
        return node
      }
    }))
  }

  const onUpdateEdge = (newEdge) => {
    console.log("update edge", newEdge);

    setEdges(edges.map((edge) => {
      if (edge.id === newEdge.id) {
        return newEdge
      } else {
        return edge
      }
    }))
  }

  const onSwapEdge = () => {
    console.log("swap edge");
  }

  const onSaveNode = (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const nodeParams = Object.fromEntries(formData.entries())
    const newNode = {...selectedNode, ...nodeParams}
    onUpdateNode(newNode)
  }

  const onSaveEdge = (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)
    const edgeParams = Object.fromEntries(formData.entries())
    const newEdge = {...selectedEdge, ...edgeParams}
    onUpdateEdge(newEdge)
  }

  const url = `http://localhost:3000/stories/${params.id}`

  const getStory = () => {
    axios.get(url)
    .then(res => {
      let story = res.data?.story
      console.log('getStory', story)
      if (story) {
        setStory(story)
        setNodes(story.graph?.nodes ?? [])
        setEdges(story.graph?.edges ?? [])
      }
    })
    .catch(err => {
      console.error(err)
    })
  }

  useEffect(getStory, [])

  const updateStory = () => {
    const graph = { nodes, edges }
    const updateParams = {
      graph
    }
    console.log('updateParams', updateParams)
    axios.patch(url, updateParams)
    .then(res => {
      console.log('updateStory', res)
    })
    .catch(err => {
      console.error(err)
    })
  }

  const deleteStory = () => {
    if (confirm(`Are you sure you want to delete "${story.title}"?`)) {
      axios.delete(url)
      .then(res => {
        window.location.href = '/stories/user'
      })
      .catch(err => {
        console.error(err)
      })
    }
  }

  const onNodeType = (event) => {
    setNodeType(event.target.value)
  }

  return (
    <>
      { story && (
      <>
        <div>
          <p>Node type:</p>
          {Object.keys(nodeTypes).map(type => (
            <div>
              <input
                type="radio"
                value={type}
                checked={type === nodeType}
                onChange={onNodeType}
              /> {type}
            </div>
          ))}
        </div>
        <div>
          <p>Shift+click creates a new node</p>
          <p>Shift+click a node and drag to another node creates an edge</p>
          <p>Click a node and pressing delete deletes the node and its edges</p>
          <p>Node text and type can be changed after selecting a node by clicking it</p>
        </div>
        <div id="graph">
          <GraphView
            nodeKey="id"
            edgeKey="id"
            nodes={nodes}
            edges={edges}
            selected={selected}
            nodeTypes={nodeTypes}
            nodeSubtypes={nodeSubtypes}
            edgeTypes={edgeTypes}

            onCreateNode={onCreateNode}
            onCreateEdge={onCreateEdge}
            onSelect={onSelect}
            canDeleteSelected={canDeleteSelected}
            onDeleteSelected={onDeleteSelected}
            onUpdateNode={onUpdateNode}
            onSwapEdge={onSwapEdge}
          />
        </div>
        { selectedNode && (
        <>
          <h2>Node ({selectedNode.type})</h2>
          {/* <p>{JSON.stringify(selectedNode)} </p> */}
          <form onSubmit={onSaveNode}>
            <div>Title: <input type="text" name="title" defaultValue={selectedNode.title ?? ''} /></div>
            <div>Text: <textarea name="text" defaultValue={selectedNode.text ?? ''} /></div>
            <button type="submit">Save Node</button>
          </form>
        </>
        ) || selectedEdge && (
        <>
          <h2>Edge ({selectedEdge.type})</h2>
          {/* <p>{JSON.stringify(selectedEdge)} </p> */}
          <form onSubmit={onSaveEdge}>
            <div>Text: <input type="text" name="handleText" defaultValue={selectedEdge.handleText ?? ''} /></div>
            <button type="submit">Save Edge</button>
          </form>
        </>
        ) || (
          <p>Nothing selected.</p>
        )}
        <hr />
        <button onClick={updateStory}>Save Story</button>
        <button onClick={deleteStory}>Delete Story</button>
      </>
      ) || (
      <>
        <p>Story not found.</p>
      </>
      )}
    </>
  );
}