import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Use environment variable for API key, fallback to default if not set
    const apiKey = process.env.SIM_AI_API_KEY || 'sk-sim-3q72uqNY8Sp5QmvbOqlwaNt5wC8JKvH-'
    
    const response = await fetch(
      'https://www.sim.ai/api/workflows/5613d8fd-280f-4592-9011-d2555e9b4010/execute',
      {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Sim AI API error:', errorData)
      
      // Try to parse error data
      let errorMessage = 'Failed to get response from Sim AI'
      try {
        const errorJson = JSON.parse(errorData)
        errorMessage = errorJson.error || errorJson.message || errorMessage
      } catch {
        errorMessage = errorData || errorMessage
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Log the full API response
    console.log('Full API Response:', JSON.stringify(data, null, 2))
    
    // Extract the output_data field which contains the formatted response
    const outputData = data.output?.output_data || data.output_data
    
    // If there's an error message in the output, prepend it to the response
    let finalOutput = outputData
    
    if (data.output && data.output.error_message) {
      finalOutput = `⚠️ ${data.output.error_message}\n\n${outputData || ''}`
    }
    
    if (!outputData && data.success !== false) {
      return NextResponse.json({
        error: 'No output data received from API'
      }, { status: 500 })
    }
    
    if (data.success === false && !outputData) {
      return NextResponse.json({
        error: data.error_message || 'The agent operation was not successful'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      response: finalOutput || outputData || JSON.stringify(data.output || data, null, 2)
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

