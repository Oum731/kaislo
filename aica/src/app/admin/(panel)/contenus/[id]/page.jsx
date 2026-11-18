import { notFound } from 'next/navigation';
import PostForm from '../PostForm';
import { postParId } from '@/lib/posts';
import { deletePost } from '../../../actions';

export default async function Edit({ params }) {
  const p = await postParId(Number((await params).id) || 0);
  if (!p) notFound();
  return (
    <>
      <h1>Modifier</h1>
      <PostForm post={p} />
      <form action={deletePost} className="danger"><input type="hidden" name="id" value={p.id} /><button className="btn danger small">Supprimer</button></form>
    </>
  );
}
