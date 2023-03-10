import config from './config'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export function NewStory() {
	const navigate = useNavigate()

	const handleSubmit = async (event) => {
		event.preventDefault()
		const formData = new FormData(event.target)
		const storyParams = Object.fromEntries(formData.entries())
		return axios.post(`${config.api}/stories`, storyParams)
		.then(res => {
			const story = res.data?.story
			//console.log(res.data)
			//console.log('new story', story)
			if (story) {
				navigate(`/${story.id}/view`)
			}
		})
		.catch(err => {
			console.error(err)
		})
	}

	return (
		<>
			<h1>New Story</h1>
			<form onSubmit={handleSubmit}>
				<div>Title: <input type="text" name="title" /></div>
				<div>Description: <textarea name="description" /></div>
				<div>Public: <input type="checkbox" name="public" /></div>
				<button type="submit">Create Story</button>
			</form>
		</>
	)
}