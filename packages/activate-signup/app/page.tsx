import { SignupBoard } from '@/components/signup-board';
import { getPublicBoard } from '@/lib/board';

export default async function Page() {
  const board = await getPublicBoard();

  return (
    <SignupBoard initialBoard={board} />
  );
}