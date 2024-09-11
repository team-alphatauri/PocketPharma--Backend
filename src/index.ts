import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Groq from 'groq-sdk'

import { zodResponseFormat } from 'openai/helpers/zod.mjs'
import { z } from "zod";

import OpenAI from 'openai'
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

type Bindings = {
  groq: string,
  
  chatgpt: string,
  groqs: Groq
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(cors())

app.use(async (context, next) => {
  // const gemini =  new GoogleGenerativeAI(context.env.gemini);
  // const model = gemini.getGenerativeModel({ model: "gemini-1.5-pro"});
  const openai = new OpenAI({
    organization: "org-yL30nnOzVyRxaW1wYSoOziCG",
    project: "proj_EcfS1AtrpKNVh9GXd2tiP3KA",
    apiKey: context.env.chatgpt
});

  const groqs =  new Groq({ apiKey: context.env.groq });
  context.set("groq", groqs);
  context.set("openai", openai);
  // context.set("gemini", model);
  await next()
})


const Schema = z.object({
  medicine_name: z.string(),
  medicine_price: z.number(),
  generic_medicine: z.array(z.object({medicine_name: z.string(), medicine_price: z.number()})),
});

app.post('/', async (context) => {
  let body = await context.req.json()
  // const gemini = context.var.gemini
  const AI = context.var.groq
  const openai = context.var.openai


    const getMedicineName = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "I have shared an possible image of medicine, Check If the uploaded image is a medicine or not! If yes, return just the name of medicine otherwise return \"null\"" },
            {
              type: "image_url",
              image_url: {
                "url": body.image,
              },
            }
          ],
        },
      ],
    });
   

  if (String(getMedicineName.choices[0].message.content).includes("null")) {
    return context.json({ message: "No medicine found in the image" })
// }
 
}
  // catch(e) {
    // let getMedicineInfo = await AI.chat.completions.create({
    //   messages: [
        
    //     {
    //       role: "user",
    //       content: [
    //         { type: "text", text:"I have shared an image of medicine, find the name of the medicine. if the medicine name cant be identifed, use the nearest medicine name. return ONLY MEDICINE NAME"},        {
    //                             "type": "image_url",
    //                             "image_url": {
    //                                 "url":body.image,
    //                             },
    //                         },
           
    //       ],
    //     },
    //   ],
    //   model: "llava-v1.5-7b-4096-preview",
    // });
    console.log(getMedicineName.choices[0].message.content)
  // let getGenericMedicineInfo = await AI.chat.completions.create({
  //   response_format: {"type": "json_object"},
  //   messages: [
  //     {role: "system", content: "You are a medical expert. You are given a medicine name and you have to suggest a generic medicine of the same medicine. If there is no generic medicine, Return ONLY JSON OBJECT."},
  //     {
  //       role: "user",
  //       content: [
  //         { type: "text", text:`generate list of 3 generic medicines which is same as original medicine: ${getMedicineName.choices[0].message.content} but cheaper, also list the original medicine price and the generic one's prices in INR in the object`},     
                
         
  //       ],
  //     },
  //   ],
  //   model: "llama3-8b-8192",
  // });

  const getGenericMedicineInfo = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: "You are a medical expert. You are given a medicine name and you have to suggest a generic medicine of the same medicine." },
      { role: "user", content: `generate list of 3 to 5 generic medicines which is same/similar to original medicine: ${getMedicineName.choices[0].message.content} but cheaper, also list the original medicine price and the generic one's prices in INR in the object` },
    ],
    response_format: zodResponseFormat(Schema, "generic_medicine_list_from_original_medicine"),
  });
  console.log(getGenericMedicineInfo.choices[0].message.content)
    return context.json(getGenericMedicineInfo.choices[0].message.content)
  
   
  

})

export default app
