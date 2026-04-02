import { Metadata } from 'next'
import { genPageMetadata } from '../seo'
import connectToDatabase from '@/lib/mongodb'
import ResumeModel from '@/models/resume'
import ResumeViewer from './ResumeViewer'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return genPageMetadata({
    title: 'Resume',
    description: 'View and download my professional resume.',
  })
}

export default async function ResumePage() {
  await connectToDatabase()
  const resumeDoc = await ResumeModel.findOne({}).lean()

  const resume = resumeDoc
    ? {
        fileUrl: resumeDoc.fileUrl as string,
        uploadedAt: resumeDoc.uploadedAt as number,
      }
    : null

  return (
    <section className="py-8 md:py-12">
      <div className="container-custom">
        <div className="terminal-page-cmd">open ./resume.pdf</div>
        <h1 className="mb-8 text-center font-mono text-3xl font-bold md:text-4xl">Resume</h1>

        {resume ? (
          <ResumeViewer fileUrl={resume.fileUrl} uploadedAt={resume.uploadedAt} />
        ) : (
          <div className="py-20 text-center">
            <p className="font-mono text-sm text-muted-foreground">Resume not yet available.</p>
          </div>
        )}
      </div>
    </section>
  )
}
