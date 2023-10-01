import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { pipeline } from "node:stream"
import { promisify } from "node:util"
import { z } from 'zod'
import { openai } from "../lib/openai";

const pump = promisify(pipeline)

export async function generateAICompletionRoute(app: FastifyInstance) {
  app.post('/ai/complete', async (request, reply) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
      template: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    })

    const { videoId, template, temperature } = paramsSchema.parse(request.params)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      }
    })

    if (!video.transcription) {
      return reply.status(400).send({ error: 'Video transcription was not generated yet.' })
    }

    const promptMessage = template.replace('{transcription}', video.transcription)

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature,
      messages: [
        { role: 'user', content: promptMessage }
      ]
    })

    return response
  })
}