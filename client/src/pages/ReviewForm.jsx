import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

// Write Review page — routed at /reviews/new (write) and /reviews/:id (edit),
// both wrapped in <ProtectedRoute>, so a token is always present here.

const defaults = { courseCode: '', rating: 5, comment: '' }

export default function ReviewForm() {
  const nav = useNavigate()
  const { id } = useParams() // undefined on /reviews/new, the review id on /reviews/:id
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')

  // TODO 3 (edit mode): load the review and fill the form.
  useEffect(() => {
    // Back on /reviews/new (e.g. from an edit page via the nav link): start empty.
    if (!id) { setForm(defaults); return }

    let ignore = false // stops a slow response from an old id overwriting a newer one
    setError('')
    api.get('/reviews/' + id)
      .then(res => {
        if (ignore) return
        const { courseCode, rating, comment } = res.data.review
        // comment is optional on the server, so default it to '' to keep the textarea controlled
        setForm({ courseCode, rating, comment: comment ?? '' })
      })
      .catch(err => {
        if (!ignore) setError(err?.response?.data?.message || 'Could not load review')
      })
    return () => { ignore = true }
  }, [id])

  // TODO 1: one handler for every input, keyed by the input's `name`.
  function onChange(e) {
    const { name, value } = e.target
    // <select> always gives a string; the API expects rating to be a number.
    setForm(prev => ({ ...prev, [name]: name === 'rating' ? Number(value) : value }))
  }

  // TODO 2 + 3: POST a new review, or PATCH the existing one when editing.
  async function onSubmit(e) {
    e.preventDefault() // stop the browser's full-page form submit/reload
    setError('')
    // Only these three fields — never reviewedBy, the server takes that from the token.
    const body = {
      courseCode: form.courseCode,
      rating: form.rating,
      comment: form.comment
    }
    try {
      if (id) await api.patch('/reviews/' + id, body)
      else await api.post('/reviews', body)
      nav('/reviews')
    } catch (err) {
      // 400 invalid input, 403 not your review, 409 already reviewed this course
      setError(err?.response?.data?.message || 'Could not save review')
    }
  }

  // TODO 4: delete, only reachable in edit mode.
  async function onDelete() {
    if (!window.confirm('Delete this review? This cannot be undone.')) return
    setError('')
    try {
      await api.delete('/reviews/' + id)
      nav('/reviews')
    } catch (err) {
      // 403 not your review, 404 already deleted
      setError(err?.response?.data?.message || 'Could not delete review')
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'Write'} Review</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input"
          name="courseCode"
          placeholder="Course code (e.g. CS101)"
          value={form.courseCode}
          onChange={onChange}
        />
        <select className="input" name="rating" value={form.rating} onChange={onChange}>
          {[1, 2, 3, 4, 5].map(n => (
            <option key={n} value={n}>{n} / 5</option>
          ))}
        </select>
        <textarea
          className="input"
          name="comment"
          rows={3}
          placeholder="Comment (optional)"
          value={form.comment}
          onChange={onChange}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button className="btn" type="submit">Save</button>
          {/* type="button" so clicking Delete doesn't also submit the form */}
          {id && <button className="btn" type="button" onClick={onDelete}>Delete</button>}
        </div>
      </form>
    </div>
  )
}
