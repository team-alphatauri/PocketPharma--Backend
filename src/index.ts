import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Groq from 'groq-sdk'
import { Buffer } from 'node:buffer'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

type Bindings = {
  groq: string,
  gemini: string,
  groqs: Groq
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(cors())

app.use(async (context, next) => {
  const gemini =  new GoogleGenerativeAI(context.env.gemini);
  const model = gemini.getGenerativeModel({ model: "gemini-1.5-pro"});


  const groqs =  new Groq({ apiKey: context.env.groq });
  context.set("groq", groqs);
  context.set("gemini", model);
  await next()
})



// chat_completion = client.chat.completions.create(
//   messages=[
//       {
//           "role": "user",
//           "content": [
//               {"type": "text", "text": "What's in this image?"},
//               {
//                   "type": "image_url",
//                   "image_url": {
//                       "url": f"data:image/jpeg;base64,{base64_image}",
//                   },
//               },
//           ],
//       }
//   ],
//   model="llava-v1.5-7b-4096-preview",
// )


app.post('/', async (context) => {
  let body = await context.req.json()
  const gemini = context.var.gemini
  const AI = context.var.groq

  
  const img = await (await fetch(body.image)).blob()
  let as = await img.arrayBuffer();
let urls = await Buffer.from(as).toString("base64")
let url = {
inlineData: {
  data: urls,
  mimeType: body.mime
},}
try {
  const result = await gemini.generateContent([
    "I have shared an possible image of medicine, Check If the uploaded image is a medicine or not! If yes, return the name of medicine otherwise return \"null\"", url
  ]); 

  if (String(result.response.text()).includes("null")) {
    
    return context.json({ message: "No medicine found in the image" })
}
 
}
  catch(e) {
    let getMedicineInfo = await AI.chat.completions.create({
      messages: [
        
        {
          role: "user",
          content: [
            { type: "text", text:"I have shared an image of medicine, find the name of the medicine. if the medicine name cant be identifed, use the nearest medicine name. return ONLY MEDICINE NAME"},        {
                                "type": "image_url",
                                "image_url": {
                                    "url":body.image,
                                },
                            },
           
          ],
        },
      ],
      model: "llava-v1.5-7b-4096-preview",
    });
  let getGenericMedicineInfo = await AI.chat.completions.create({
    response_format: {"type": "json_object"},
    messages: [
      {role: "system", content: "You are a medical expert. You are given a medicine name and you have to suggest a generic medicine of the same medicine. If there is no generic medicine, Return ONLY JSON OBJECT."},
      {
        role: "user",
        content: [
          { type: "text", text:`generate list of 3 generic medicines which is same as original medicine: ${getMedicineInfo.choices[0].message.content} but cheaper, also list the original medicine price and the generic one's prices in INR in the object`},     
                
         
        ],
      },
    ],
    model: "llama3-8b-8192",
  });

    return context.json(getGenericMedicineInfo.choices[0].message.content)
  
   
  }

})

export default app
